#!/usr/bin/env node
const Client = require("websocket").client;

class WebSocketClient {

    constructor(options) {
        this.handleConnect = this.handleConnect.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.connect(options);
    }

    connect(options) {
        let {
            onError,
            onClose,
            onConnect,
            onMessage,
            serverUrl,
            logMessages = false
        } = options;

        this.onConnect = onConnect;
        this.onError = onError;
        this.onClose = onClose;
        this.onMessage = onMessage;
        this.logMessages = logMessages;

        this.client = new Client();

        this.client.on("connectFailed", error => {
            this.handleError(error);
        });

        this.client.on("connect", connection => {
            this.handleConnect(connection);
        });

        if(serverUrl){
            this.client.connect(serverUrl);
        } else {
            throw Error("no serverUrl provided");
        }

    }

    // sendIdent(connection, apiKey = config.apiKey) {
    //     connection.sendUTF(
    //         JSON.stringify({
    //             op: 2,
    //             d: {
    //                 token: apiKey,
    //                 properties: {
    //                     os: "Windows",
    //                     browser: "Chrome",
    //                     device: "",
    //                     browser_user_agent:
    //                         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36",
    //                     browser_version: "67.0.3396.99",
    //                     os_version: "10",
    //                     referrer: "https://discordapp.com/",
    //                     referring_domain: "discordapp.com",
    //                     referrer_current: "https://discordapp.com/",
    //                     referring_domain_current: "discordapp.com",
    //                     release_channel: "stable",
    //                     client_build_number: 18947
    //                 },
    //                 presence: {status: "online", since: 0, afk: false, game: null},
    //                 compress: false
    //             }
    //         })
    //     );
    // }

    // sendHeartbeatSetTimeout(connection) {
    //     this.sendHeardBeat(connection);
    //     setTimeout(() => {
    //         this.sendHeartbeatSetTimeout(connection);
    //     }, 42000);
    // }

    // sendHeardBeat(connection) {
    //     var msg = {
    //         op: 1,
    //         d: this.seq
    //     };
    //     console.log("heartbeat sent: " + JSON.stringify(msg));
    //     connection.sendUTF(JSON.stringify(msg));
    // }

    // closeConnection() {
    //     if (this.connection) {
    //         this.connection.drop();
    //     }
    // }

    handleConnect(connection) {

        this.connection = connection;

        connection.on("error", error => {
            this.handleError(error);
        });

        connection.on("close", () => {
            this.handleClose();
        });

        connection.on("message", message => {
            this.handleMessage(message);

        });

        if (this.onConnect) {
            this.onConnect();
        }
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

    handleMessage(message) {
        if (message.type === "utf8") {
            let messageObject = JSON.parse(message.utf8Data);
            if (this.onMessage) {
                this.onMessage(messageObject);
            }
        }

        if (this.logMessages) {
            console.log(msg);
        }
    }

    sendMessage(message) {

        if (this.connection) {
            this.connection.sendUTF(
                JSON.stringify(message));
            return;
        }

        throw Error("no connection");
    }


}

module.exports = WebSocketClient;
