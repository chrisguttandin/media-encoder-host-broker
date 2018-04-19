import { IBrokerDefinition } from 'broker-factory';

export interface IMediaEncoderHostBrokerDefinition extends IBrokerDefinition {

    cancel (encoderId: number): Promise<void>;

    encode (encoderId: number): Promise<ArrayBuffer[]>;

    instantiate (mimeType: string): Promise<{ encoderId: number, port: MessagePort }>;

    load (url: string): Promise<RegExp>;

}
