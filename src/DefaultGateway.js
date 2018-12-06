let WebSocketClient = require('./WebSocketClient');
const EventEmitter = require('events');



class DefaultGateway extends EventEmitter{

    constructor(channelId, serverUrl) {
        super();
        this.sendGatewayVoiceStateUpdate = this.sendGatewayVoiceStateUpdate.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.channelId = channelId;
        this.serverUrl = serverUrl;
        this.wsClient = null;
        this.connect(channelId, serverUrl);
    }

    connect(channelId, serverUrl) {
        this.channelId = channelId;
        this.serverUrl = serverUrl;
        this.connectToGateWay(this.serverUrl);
    }

    connectToGateWay(serverUrl) {
        this.emit(DefaultGateway.CONNECTING_TO_DEFAULT_GATEWAY);
        let websocketOptions = {
            serverUrl,
            onConnect: this.handleConnect,
            onMessage: this.handleMessage,
            onClose: this.handleClose,
            onError: this.handleError,
        };
        this.wsClient = new WebSocketClient(websocketOptions);
    }

    sendGatewayVoiceStateUpdate() {

        let message = {
            "op": 4,
            "d": {
                // "guild_id": "41771983423143937",
                "channel_id": this.channelId,
                "self_mute": false,
                "self_deaf": false
            }
        };

        this.wsClient.sendMessage(message);
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
                this.emit(DefaultGateway.CONNECTED_TO_DEFAULT_GATEWAY);
                this.sendGatewayVoiceStateUpdate();
    }

    handleMessage(message) {
        switch (message.t) {
            case "VOICE_SERVER_UPDATE": {
                this.emit(DefaultGateway.VOICE_SERVER_UPDATE, message.d);
                break;
            }
            case "VOICE_STATE_UPDATE": {
                this.emit(DefaultGateway.VOICE_STATE_UPDATE, message.d);
                break;
            }

        }
    }

    onClose(callback) {
        this.onClose = callback;
    }

    onError(callback) {
        this.onError = callback;
    }
}

DefaultGateway.CONNECTING_TO_DEFAULT_GATEWAY = "CONNECTING_TO_DEFAULT_GATEWAY";
DefaultGateway.CONNECTED_TO_DEFAULT_GATEWAY = "CONNECTED_TO_DEFAULT_GATEWAY";
DefaultGateway.VOICE_SERVER_UPDATE = "VOICE_SERVER_UPDATE";
DefaultGateway.VOICE_STATE_UPDATE = "VOICE_STATE_UPDATE";

module.exports = DefaultGateway;
