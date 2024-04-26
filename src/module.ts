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

const encoderInstanceIds = new Set<number>();

export const wrap: TMediaEncoderHostBrokerWrapper = createBroker<IMediaEncoderHostBrokerDefinition, TMediaEncoderHostWorkerDefinition>({
    deregister: ({ call }) => {
        return (port) => {
            return call('deregister', { port }, [port]);
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
        return (port) => {
            return call('register', { port }, [port]);
        };
    }
});

export const load: TMediaEncoderHostBrokerLoader = (url: string) => {
    const worker = new Worker(url);

    return wrap(worker);
};
