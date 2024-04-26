import { load, wrap } from '../../src/module';

describe('module', () => {
    let url;

    afterEach(() => {
        Worker.reset();
    });

    beforeEach(() => {
        // eslint-disable-next-line no-global-assign
        Worker = ((OriginalWorker) => {
            const instances = [];

            return class ExtendedWorker extends OriginalWorker {
                constructor(rl) {
                    super(rl);

                    const addEventListener = this.addEventListener;

                    // This is an ugly hack to prevent the broker from handling mirrored events.
                    this.addEventListener = (index, ...args) => {
                        if (typeof index === 'number') {
                            return addEventListener.apply(this, args);
                        }
                    };

                    instances.push(this);
                }

                static addEventListener(index, ...args) {
                    return instances[index].addEventListener(index, ...args);
                }

                static get instances() {
                    return instances;
                }

                static reset() {
                    // eslint-disable-next-line no-global-assign
                    Worker = OriginalWorker;
                }
            };
        })(Worker);

        const blob = new Blob(
            [
                `self.addEventListener('message', ({ data }) => {
                // The port needs to be send as a Transferable because it can't be cloned.
                if (data.params !== undefined && data.params.port !== undefined) {
                    self.postMessage(data, [ data.params.port ]);
                } else {
                    self.postMessage(data);
                }
            });`
            ],
            { type: 'application/javascript' }
        );

        url = URL.createObjectURL(blob);
    });

    for (const method of ['loaded', 'wrapped']) {
        describe(`with a ${method} worker`, () => {
            let mediaEncoderHost;

            beforeEach(() => {
                if (method === 'loaded') {
                    mediaEncoderHost = load(url);
                } else {
                    const worker = new Worker(url);

                    mediaEncoderHost = wrap(worker);
                }

                URL.revokeObjectURL(url);
            });

            describe('deregister()', () => {
                let encoderId;
                let port;

                beforeEach((done) => {
                    const messageChannel = new MessageChannel();

                    port = messageChannel.port1;

                    Worker.addEventListener(0, 'message', ({ data }) => {
                        if (data.method === 'register') {
                            encoderId = data.params.encoderId;

                            done();
                        }
                    });

                    mediaEncoderHost.register(port);
                });

                it('should send the correct message', (done) => {
                    Worker.addEventListener(0, 'message', ({ data }) => {
                        expect(data.id).to.be.a('number');

                        expect(data).to.deep.equal({
                            id: data.id,
                            method: 'deregister',
                            params: { encoderId }
                        });

                        done();
                    });

                    mediaEncoderHost.deregister(port);
                });
            });

            describe('encode()', () => {
                let encoderInstanceId;
                let timeslice;

                beforeEach(() => {
                    encoderInstanceId = 63;
                    timeslice = 300;
                });

                it('should send the correct message', (done) => {
                    Worker.addEventListener(0, 'message', ({ data }) => {
                        expect(data.id).to.be.a('number');

                        expect(data).to.deep.equal({
                            id: data.id,
                            method: 'encode',
                            params: { encoderInstanceId, timeslice }
                        });

                        done();
                    });

                    mediaEncoderHost.encode(encoderInstanceId, timeslice);
                });
            });

            describe('instantiate()', () => {
                let mimeType;
                let sampleRate;

                beforeEach(() => {
                    mimeType = 'a fake mimeType';
                    sampleRate = 48000;
                });

                it('should send the correct message', (done) => {
                    Worker.addEventListener(0, 'message', ({ data }) => {
                        expect(data.id).to.be.a('number');

                        expect(data.params.encoderInstanceId).to.be.a('number');

                        expect(data).to.deep.equal({
                            id: data.id,
                            method: 'instantiate',
                            params: { encoderInstanceId: data.params.encoderInstanceId, mimeType, sampleRate }
                        });

                        done();
                    });

                    mediaEncoderHost.instantiate(mimeType, sampleRate);
                });
            });

            describe('register()', () => {
                let port;

                beforeEach(() => {
                    const messageChannel = new MessageChannel();

                    port = messageChannel.port1;
                });

                it('should send the correct message', (done) => {
                    Worker.addEventListener(0, 'message', ({ data }) => {
                        expect(data.id).to.be.a('number');
                        expect(data.params.encoderId).to.be.a('number');

                        expect(data).to.deep.equal({
                            id: data.id,
                            method: 'register',
                            params: { encoderId: data.params.encoderId, port }
                        });

                        done();
                    });

                    mediaEncoderHost.register(port);
                });
            });
        });
    }
});
