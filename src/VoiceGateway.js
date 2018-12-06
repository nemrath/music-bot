let WebSocketClient = require('./WebSocketClient');
const EventEmitter = require('events');
// const crypto = require('crypto');
const sleep = require("util").promisify(setTimeout);
/**
 * @constructor
 * @extends EventEmitter
 */
class VoiceGateway extends EventEmitter {

    constructor(serverUrl, sessionId) {
        super();
        this.sendGatewayVoiceStateUpdate = this.sendGatewayVoiceStateUpdate.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.sendingHeartBeats = false;
        this.sessionId = sessionId;
        this.serverUrl = serverUrl;
        this.wsClient = null;
        this.connect(serverUrl);
    }

    connect(serverUrl) {
        this.serverUrl = serverUrl;
        this.connectToGateWay(this.serverUrl);
    }

    connectToGateWay(serverUrl) {
        this.emit(VoiceGateway.CONNECTING_TO_VOICE_GATEWAY);
        let websocketOptions = {
            serverUrl,
            onConnect: this.handleConnect,
            onMessage: this.handleMessage,
            onClose: this.handleClose,
            onError: this.handleError,
        };
        this.wsClient = new WebSocketClient(websocketOptions);
    }

    sendSelectProtocolPayload(address, port, mode = "xsalsa20_poly1305") {
        let payload = {
            "op": 1,
            "d": {
                "protocol": "udp",
                "data": {
                    "address": address,
                    "port": port,
                    "mode": port
                }
            }
        };
        this.wsClient.sendMessage(payload);
    }

    sendVoiceIdentifyPayload(botId = config.botId, token= config.apiKey) {
        let payload = {
            "op": 0,
            "d": {
                // "server_id": "41771983423143937",
                "user_id": botId,
                "session_id": this.sessionId,
                "token": token
            }
        };
        this.wsClient.sendMessage(payload);
    }

    sendStartedSpeakingPayload() {
        let payload = {
            "op": 5,
            "d": {
                "speaking": true,
                "delay": 0,
                "ssrc": 1
            }
        };
        this.wsClient.sendMessage(payload);
    }

    sendStoppedSpeakingPayload() {
        let payload = {
            "op": 5,
            "d": {
                "speaking": false,
                "delay": 0,
                "ssrc": 1
            }
        };
        this.wsClient.sendMessage(payload);
    }

    sendResumeConnectionPayload(sessionId, token) {
        let payload = {
            "op": 7,
            "d": {
                // "server_id": "41771983423143937",
                "session_id": sessionId,
                "token": token
            }
        };
        this.wsClient.sendMessage(payload);
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


    handleConnect() {
        this.emit(VoiceGateway.CONNECTED_TO_VOICE_GATEWAY);
        this.sendVoiceIdentifyPayload();
    }

    handleMessage(message) {
        switch (message.op) {
            case 2: {
                this.emit(VoiceGateway.VOICE_SERVER_READY, message.d);
                break;
            }
            case 8: {
                this.emit(VoiceGateway.HELLO_RECEIVED, message.d);
                break;
            }
            case 4: {
                this.emit(VoiceGateway.SESSION_DESCRIPTION_RECEIVED, message.d)
            }
        }
    }

    onClose(callback) {
        this.onClose = callback;
    }

    onError(callback) {
        this.onError = callback;
    }

    setHeartbeatInterval(heartbeatInterval) {
        this.heartbeatInterval = heartbeatInterval;
    }

    stopSendingHeartbeats() {
        this.sendingHeartBeats = false;
    }

    async startSendingHeartbeats() {
        if (!this.sendingHeartBeats) {
            this.sendingHeartBeats = true;

            while (this.sendingHeartBeats) {
                await sleep(this.heartbeatInterval);
                let nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                this.wsClient.sendMessage({
                    "op": 3,
                    "d": nonce
                });
            }

        }
    }
}

VoiceGateway.CONNECTING_TO_VOICE_GATEWAY = "CONNECTING_TO_VOICE_GATEWAY";
VoiceGateway.CONNECTED_TO_VOICE_GATEWAY = "CONNECTED_TO_VOICE_GATEWAY";
VoiceGateway.VOICE_SERVER_READY = "VOICE_SERVER_READY";
VoiceGateway.HELLO_RECEIVED = "HELLO_RECEIVED";
VoiceGateway.SESSION_DESCRIPTION_RECEIVED = "SESSION_DESCRIPTION_RECEIVED";

module.exports = VoiceGateway;
