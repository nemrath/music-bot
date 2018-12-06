let ffmpegPath = require('ffmpeg-binaries');
const EventEmitter = require('events');
const ChildProcess = require('child_process');
let defaultParameters = '-i - -analyzeduration 0 -loglevel 0 -f s16le -ar 48000 -ac 2 -ss 0 pipe:1';

class Ffmpeg extends EventEmitter {
//
    constructor(path = ffmpegPath, parameters = defaultParameters, inputMedia) {
        super();
        this.run(path, parameters, inputMedia);
    }

    run(path = ffmpegPath, parameters = defaultParameters, inputMedia) {

        let options = parameters.match(/\S+/g) || [];
        this.process = ChildProcess.spawn(path, options);
        this.attachErrorHandlers();

        try {
            return this.connectStream(inputMedia);
        } catch (e) {
            this.emit('error', e, 'instantiation');
        }

    }

    getStdOut() {
        return this.process.stdout;
    }

    kill() {
        if (!this.process) return;
        if (this.inputMedia && this.inputMedia.unpipe) {
            this.inputMedia.unpipe(this.process.stdin);
        }
        this.process.kill('SIGKILL');
        this.process = null;
    }

    /**
     * Connects an input stream to the ffmpeg process
     * @param {ReadableStream} inputMedia the stream to pass to ffmpeg
     * @returns {ReadableStream} the ffmpeg output stream
     */
    connectStream(inputMedia) {
        if (!this.process) throw new Error('No FFMPEG process available');
        this.inputMedia = inputMedia;
        this.inputMedia.pipe(this.process.stdin, {end: false});
        inputMedia.on('error', e => this.emit('error', e, 'inputstream', inputMedia));
        return this.process.stdout;
    }

    attachErrorHandlers() {
        this.process.stdin.on('error', e => {
            // if not killed
            if (this.process) {
                this.emit('error', e, 'ffmpegProcess.stdin');
            }
        });
        this.process.stdout.on('error', e => {
            // if not killed
            if (this.process) {
                this.emit('error', e, 'ffmpegProcess.stdout');
            }
        });
        this.process.on('error', e => this.emit('error', e, 'ffmpegProcess'));
        this.process.stdout.on('end', () => this.emit('end'));
        this.on('error', this.kill.bind(this));
        this.once('end', this.kill.bind(this));
    }
}
