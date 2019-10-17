import { load, wrap } from '../../src/module';

describe('module', () => {

    let url;

    afterEach(() => {
        Worker.reset();
    });

    beforeEach(() => {
        Worker = ((OriginalWorker) => { // eslint-disable-line no-global-assign
            const instances = [];

            return class ExtendedWorker extends OriginalWorker {

                constructor (rl) {
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

                static addEventListener (index, ...args) {
                    return instances[index].addEventListener(index, ...args);
                }

                static get instances () {
                    return instances;
                }

                static reset () {
                    Worker = OriginalWorker; // eslint-disable-line no-global-assign
                }

            };
        })(Worker);

        const blob = new Blob([
            `self.addEventListener('message', ({ data }) => {
                // The port needs to be send as a Transferable because it can't be cloned.
                if (data.params !== undefined && data.params.port !== undefined) {
                    self.postMessage(data, [ data.params.port ]);
                } else {
                    self.postMessage(data);
                }
            });`
        ], { type: 'application/javascript' });

        url = URL.createObjectURL(blob);
    });

    leche.withData([ 'loaded', 'wrapped' ], (method) => {

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

        describe('cancel()', () => {

            let encoderId;

            beforeEach(() => {
                encoderId = 63;
            });

            it('should send the correct message', function (done) {
                this.timeout(6000);

                Worker.addEventListener(0, 'message', ({ data }) => {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'cancel',
                        params: { encoderId }
                    });

                    done();
                });

                mediaEncoderHost.cancel(encoderId);
            });

        });

        describe('encode()', () => {

            let encoderId;
            let timeslice;

            beforeEach(() => {
                encoderId = 63;
                timeslice = 300;
            });

            it('should send the correct message', function (done) {
                this.timeout(6000);

                Worker.addEventListener(0, 'message', ({ data }) => {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'encode',
                        params: { encoderId, timeslice }
                    });

                    done();
                });

                mediaEncoderHost.encode(encoderId, timeslice);
            });

        });

        describe('instantiate()', () => {

            let mimeType;
            let sampleRate;

            beforeEach(() => {
                mimeType = 'a fake mimeType';
                sampleRate = 48000;
            });

            it('should send the correct message', function (done) {
                this.timeout(6000);

                Worker.addEventListener(0, 'message', ({ data }) => {
                    expect(data.id).to.be.a('number');

                    expect(data.params.encoderId).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'instantiate',
                        params: { encoderId: data.params.encoderId, mimeType, sampleRate }
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

            it('should send the correct message', function (done) {
                this.timeout(6000);

                Worker.addEventListener(0, 'message', ({ data }) => {
                    expect(data.id).to.be.a('number');

                    expect(data).to.deep.equal({
                        id: data.id,
                        method: 'register',
                        params: { port }
                    });

                    done();
                });

                mediaEncoderHost.register(port);
            });

        });

    });

});
