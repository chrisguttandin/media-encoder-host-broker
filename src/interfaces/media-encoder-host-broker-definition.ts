import { IBrokerDefinition } from 'broker-factory';

export interface IMediaEncoderHostBrokerDefinition extends IBrokerDefinition {
    deregister(port: MessagePort): Promise<null>;

    encode(encoderInstanceId: number, timeslice: null | number): Promise<ArrayBuffer[]>;

    instantiate(mimeType: string, sampleRate: number): Promise<{ encoderInstanceId: number; port: MessagePort }>;

    register(port: MessagePort): Promise<RegExp>;
}
