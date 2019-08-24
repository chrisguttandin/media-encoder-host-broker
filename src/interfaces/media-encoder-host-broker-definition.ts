import { IBrokerDefinition } from 'broker-factory';

export interface IMediaEncoderHostBrokerDefinition extends IBrokerDefinition {

    cancel (encoderId: number): Promise<void>; // tslint:disable-line:invalid-void

    encode (encoderId: number): Promise<ArrayBuffer[]>;

    instantiate (mimeType: string): Promise<{ encoderId: number; port: MessagePort }>;

    register (port: MessagePort): Promise<RegExp>;

}
