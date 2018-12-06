let opus = require('node-opus');

class OpusCodec {

    constructor({bitrate = 48, fec = false, plp = 0} = {}) {

        this.ctl = {
            BITRATE: 4002,
            FEC: 4012,
            PLP: 4014,
        };

        this.samplingRate = 48000;
        this.channels = 2;
        this.bitrate = bitrate;
        this.options = {fec, plp};
        this.encoder = new opus.OpusEncoder(this.samplingRate, this.channels);
        this.init();
    }

    init() {
        try {
            this.setBitrate(this.bitrate);

            // Set FEC (forward error correction)
            if (this.options.fec) this.setFEC(this.options.fec);

            // Set PLP (expected packet loss percentage)
            if (this.options.plp) this.setPLP(this.options.plp);
        } catch (err) {
            // Opus engine likely has no support for libopus CTL
        }
    }

    setBitrate(bitrate) {
        this.encoder.applyEncoderCTL(this.ctl.BITRATE, Math.min(128, Math.max(16, bitrate)) * 1000);
    }

    setFEC(enabled) {
        this.encoder.applyEncoderCTL(this.ctl.FEC, enabled ? 1 : 0);
    }

    setPLP(percent) {
        this.encoder.applyEncoderCTL(this.ctl.PLP, Math.min(100, Math.max(0, percent * 100)));
    }

    encode(buffer) {
        return this.encoder.encode(buffer, 1920);
    }

    decode(buffer) {
        return this.encoder.decode(buffer, 1920);
    }
}

module.exports = OpusCodec;
