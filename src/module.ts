import { createBroker } from 'broker-factory';
import { addUniqueNumber } from 'fast-unique-numbers';
import { TMediaEncoderHostWorkerDefinition } from 'media-encoder-host-worker';
import { IMediaEncoderHostBrokerDefinition } from './interfaces';
import { TMediaEncoderHostBrokerLoader, TMediaEncoderHostBrokerWrapper } from './types';

export * from './interfaces';
export * from './types';

const encoderIds: Set<number> = new Set();

export const wrap: TMediaEncoderHostBrokerWrapper = createBroker<IMediaEncoderHostBrokerDefinition, TMediaEncoderHostWorkerDefinition>({
    cancel: ({ call }) => async (encoderId) => {
        await call('cancel', { encoderId });

        encoderIds.delete(encoderId);
    },
    encode: ({ call }) => async (encoderId) => {
        const arrayBuffers = await call('encode', { encoderId });

        encoderIds.delete(encoderId);

        return arrayBuffers;
    },
    instantiate: ({ call }) => {
        return async (mimeType) => {
            const encoderId = addUniqueNumber(encoderIds);
            const port = await call('instantiate', { encoderId, mimeType });

            return { encoderId, port };
        };
    },
    register: ({ call }) => (port) => {
        return call('register', { port }, [ port ]);
    }
});

export const load: TMediaEncoderHostBrokerLoader = (url: string) => {
    const worker = new Worker(url);

    return wrap(worker);
};
