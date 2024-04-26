import { createBroker } from 'broker-factory';
import { addUniqueNumber } from 'fast-unique-numbers';
import { TMediaEncoderHostWorkerDefinition } from 'media-encoder-host-worker';
import { IMediaEncoderHostBrokerDefinition } from './interfaces';
import { TMediaEncoderHostBrokerLoader, TMediaEncoderHostBrokerWrapper } from './types';

/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './interfaces/index';
export * from './types/index';

const encoderIds = new Set<number>();
const encoderInstanceIds = new Set<number>();
const messagePorts = new WeakMap<MessagePort, number>();

export const wrap: TMediaEncoderHostBrokerWrapper = createBroker<IMediaEncoderHostBrokerDefinition, TMediaEncoderHostWorkerDefinition>({
    deregister: ({ call }) => {
        return async (port) => {
            const encoderId = messagePorts.get(port);

            if (encoderId === undefined) {
                throw new Error('There is no encoder registered with the given port.');
            }

            const result = await call('deregister', { encoderId });

            encoderIds.delete(encoderId);
            messagePorts.delete(port);

            return result;
        };
    },
    encode: ({ call }) => {
        return async (encoderInstanceId, timeslice) => {
            const arrayBuffers = await call('encode', { encoderInstanceId, timeslice });

            encoderInstanceIds.delete(encoderInstanceId);

            return arrayBuffers;
        };
    },
    instantiate: ({ call }) => {
        return async (mimeType, sampleRate) => {
            const encoderInstanceId = addUniqueNumber(encoderInstanceIds);
            const port = await call('instantiate', { encoderInstanceId, mimeType, sampleRate });

            return { encoderInstanceId, port };
        };
    },
    register: ({ call }) => {
        return async (port) => {
            if (messagePorts.has(port)) {
                throw new Error('');
            }

            const encoderId = addUniqueNumber(encoderIds);

            messagePorts.set(port, encoderId);

            try {
                return await call('register', { encoderId, port }, [port]);
            } catch (err) {
                encoderIds.delete(encoderId);
                messagePorts.delete(port);

                throw err;
            }
        };
    }
});

export const load: TMediaEncoderHostBrokerLoader = (url: string) => {
    const worker = new Worker(url);

    return wrap(worker);
};
