const DefaultGateway = require('./DefaultGateway');
const VoiceGateway = require('./VoiceGateway');
const VoiceUdpConnection = require('./VoiceUdpConnection');
const secretbox = require('./util/Secretbox');
const OpusCode = require('./OpusCodec');

class ConnectionStatus {
}

ConnectionStatus.CONNECTING_TO_DEFAULT_GATEWAY = "CONNECTING_TO_DEFAULT_GATEWAY";
ConnectionStatus.CONNECTING_TO_VOICE_GATEWAY = "CONNECTING_TO_VOICE_GATEWAY";
ConnectionStatus.NOT_CONNECTED = "NOT_CONNECTED";
ConnectionStatus.CONNECTED_TO_DEFAULT_GATEWAY = "CONNECTED_TO_DEFAULT_GATEWAY";
ConnectionStatus.CONNECTED_TO_VOICE_GATEWAY = "CONNECTED_TO_VOICE_GATEWAY";
ConnectionStatus.FULLY_CONNECTED = "FULLY_CONNECTED";
const nonce = Buffer.alloc(24);
nonce.fill(0);

class VoiceConnection {

    constructor(channelId) {
        this.sendGatewayVoiceStateUpdate = this.sendGatewayVoiceStateUpdate.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleHelloReceived = this.handleHelloReceived.bind(this);
        this.handleVoiceServerUpdate = this.handleVoiceServerUpdate.bind(this);
        this.handleVoiceStateUpdate = this.handleVoiceStateUpdate.bind(this);
        this.handleVoiceServerReady = this.handleVoiceServerReady.bind(this);
        this.handleSessionDescriptionReceived = this.handleSessionDescriptionReceived.bind(this);
        this.opusCodec = new OpusCode();
        this.channelId = channelId;
        this.sessionId = null;
        this.status = ConnectionStatus.NOT_CONNECTED;
        this.voiceUdpConnection = null;
        this.connect(channelId);
        this.discordGateWay = "wss://gateway.discord.gg/?v=6&encoding=json";
        this.passes = 1;
    }

    connect(channelId) {
        this.channelId = channelId;
        this.setStatus(ConnectionStatus.CONNECTING_TO_DEFAULT_GATEWAY);
        this.connectToDefaultGateWay(this.discordGateWay, this.channelId);
    }

    handleVoiceStateUpdate(message) {
        this.sessionId = message.session_id;

        if (this.sessionId && this.voiceGateWay) {
            this.connectToVoiceGateWay(this.voiceGateWay, this.channelId);
        }
    }

    handleVoiceServerUpdate(message) {
        this.voiceGateWay = "wss://" + message.d.endpoint;

        if (this.sessionId && this.voiceGateWay) {
            this.connectToVoiceGateWay(this.voiceGateWay, this.channelId);
        }
    }

    async handleVoiceServerReady(voiceServerInfo) {
        this.ssrc = voiceServerInfo.ssrc;
        this.voiceUdpConnection = new VoiceUdpConnection(voiceServerInfo.ip, voiceServerInfo.port, voiceServerInfo.ssrc);
        let {ip, port} = await this.voiceUdpConnection.discoverIp();
        this.voiceGateWay.sendSelectProtocolPayload(ip, port);
    }

    async handleHelloReceived({heartbeat_interval}) {
        this.voiceGateway.setHeartbeatInterval(heartbeat_interval);
        await this.voiceGateway.startSendingHeartbeats();
    }

    handleSessionDescriptionReceived({secret_key}) {
        // this.mode = mode;
        this.secretKey = secret_key;
        this.setStatus(ConnectionStatus.FULLY_CONNECTED);
        if (this.inputStreamReady()) {
            this.startStreaming();
        }
    }

    connectToDefaultGateWay(serverUrl, channelId) {
        this.defaultGateway = new DefaultGateway(serverUrl, channelId);
        this.defaultGateway.on(DefaultGateway.VOICE_SERVER_UPDATE, this.handleVoiceServerUpdate);
        this.defaultGateway.on(DefaultGateway.VOICE_STATE_UPDATE, this.handleVoiceStateUpdate);
    }

    connectToVoiceGateWay(serverUrl, channelId) {
        this.voiceGateway = new VoiceGateway(serverUrl, channelId);
        this.voiceGateway.on(VoiceGateway.VOICE_SERVER_READY, this.handleVoiceServerReady);
        this.voiceGateway.on(VoiceGateway.HELLO_RECEIVED, this.handleHelloReceived);
        this.voiceGateway.on(VoiceGateway.SESSION_DESCRIPTION_RECEIVED, this.handleSessionDescriptionReceived);
    }


    handleError(error) {
        if (this.onError) {
            this.onError(error);
        }
    }

    handleClose() {
        if (this.onClose) {
            this.onClose();
        }
    }

    onClose(callback) {
        this.onClose = callback;
    }

    onError(callback) {
        this.onError = callback;
    }

    setStatus(status) {
        this.status = status;
    }

    playStream(stream) {
        this.setStream(stream);
        this.setInputStreamReady(true);
        if (this.isConnected()) {
            this.startStreaming();
        }
    }

    startStreaming() {
        if (!this.stream) {
            /**
             * Emitted if the dispatcher encounters an error.
             * @event StreamDispatcher#error
             * @param {string} error The error message
             */
            this.emit('error', 'No stream');
            return;
        }

        // this.stream.on('end', err => this.destroy('end', err || 'stream'));
        // this.stream.on('error', err => this.destroy('error', err));

        // const data = this.streamingData;
        // data.length = 20;
        // data.missed = 0;

        this.stream.once('readable', () => {
            data.startTime = null;
            data.count = 0;
            this.onStreamReadable();
        });
    }

    readStreamBuffer() {
        // const data = this.streamingData;
        // const bufferLength = (this._opus ? 80 : 1920) * data.channels;
        const bufferLength = 80 * data.channels;
        let buffer = this.stream.read(bufferLength);
        // if (this._opus) return buffer;
        // if (!buffer) return null;

        if (buffer.length !== bufferLength) {
            const newBuffer = Buffer.alloc(bufferLength).fill(0);
            buffer.copy(newBuffer);
            buffer = newBuffer;
        }

        // buffer = this.applyVolume(buffer);
        return buffer;
    }

    onStreamReadable() {
        const buffer = this.readStreamBuffer();
        // if (!buffer) {
        //     data.missed++;
        //     data.pausedTime += data.length * 10;
        //     this.player.voiceConnection.voiceManager.client.setTimeout(() => this.process(), data.length * 10);
        //     return;
        // }

        data.missed = 0;

        // this.stepStreamingData();

        this.sendBuffer(null, data.sequence, data.timestamp, buffer);

    }

    sendBuffer(buffer, sequence, timestamp, opusPacket) {
        opusPacket = this.opusCodec.encode(buffer);
        const packet = this.createPacket(sequence, timestamp, opusPacket);
        this.sendPacket(packet);
    }

    sendPacket(packet) {
        let repeats = this.passes;
        /**
         * Emitted whenever the dispatcher has debug information.
         * @event StreamDispatcher#debug
         * @param {string} info The debug info
         */
        // this.setSpeaking(true);
        while (repeats--) {
            this.voiceUdpConnection.send(packet);
        }
    }

    createPacket(sequence, timestamp, buffer) {
        const packetBuffer = Buffer.alloc(buffer.length + 28);
        packetBuffer.fill(0);
        packetBuffer[0] = 0x80;
        packetBuffer[1] = 0x78;

        packetBuffer.writeUIntBE(sequence, 2, 2);
        packetBuffer.writeUIntBE(timestamp, 4, 4);
        packetBuffer.writeUIntBE(this.ssrc, 8, 4);

        packetBuffer.copy(nonce, 0, 0, 12);
        buffer = secretbox.methods.close(buffer, nonce, this.secretKey);
        for (let i = 0; i < buffer.length; i++) packetBuffer[i + 12] = buffer[i];

        return packetBuffer;
    }

    setStream(stream) {
        this.stream = stream;
    }

    isConnected() {
        return this.status === ConnectionStatus.FULLY_CONNECTED;
    }

    setInputStreamReady(value) {
        this.inputStreamReady = value;
    }

    inputStreamReady() {
        return this.inputStreamReady;
    }
}

module.exports = VoiceConnection;
