#!/usr/bin/env node
let config = require("../config");
var Client = require("websocket").client;
class WebSocketClient {
  constructor(options) {
    this.connect(options);
  }

  connect(options) {
    let {
      onMessage,
      apiKey = config.apiKey,
      serverUrl = "wss://gateway.discord.gg/?v=6&encoding=json",
      logMessages = false
    } = options;

    let self = this;
    this.onMessage = onMessage;
    this.logMessages = logMessages;
    this.sendHeardBeat = this.sendHeardBeat.bind(this);
    this.processMessage = this.processMessage.bind(this);

    this.client = new Client();
    this.seq = null;
    this.client.on("connectFailed", function(error) {
      console.log("Connect Error: " + error.toString());
    });
    this.client.on("connect", connection => {
      self.connection = connection;
      console.log("WebSocket Client Connected");

      this.sendIdent(connection, apiKey);

      setTimeout(() => {
        this.sendHeartbeatSetTimeout(connection);
      }, 7000);

      connection.on("error", function(error) {
        console.log("Connection Error: " + error.toString());
        if (config.autoReconnect) {
          self.client.connect(serverUrl);
        }
      });

      connection.on("close", function() {
        console.log("echo-protocol Connection Closed");
        if (config.autoReconnect) {
          self.client.connect(serverUrl);
        }
      });

      connection.on("message", message => {
        if (message.type === "utf8") {
          let dmsg = JSON.parse(message.utf8Data);
          this.seq = dmsg.s;
          self.processMessage(dmsg);
        }
      });
    });

    this.client.connect(serverUrl);
  }

  sendIdent(connection, apiKey = config.apiKey) {
    connection.sendUTF(
      JSON.stringify({
        op: 2,
        d: {
          token: apiKey,
          properties: {
            os: "Windows",
            browser: "Chrome",
            device: "",
            browser_user_agent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36",
            browser_version: "67.0.3396.99",
            os_version: "10",
            referrer: "https://discordapp.com/",
            referring_domain: "discordapp.com",
            referrer_current: "https://discordapp.com/",
            referring_domain_current: "discordapp.com",
            release_channel: "stable",
            client_build_number: 18947
          },
          presence: { status: "online", since: 0, afk: false, game: null },
          compress: false
        }
      })
    );
  }

  sendHeartbeatSetTimeout(connection) {
    this.sendHeardBeat(connection);
    setTimeout(() => {
      this.sendHeartbeatSetTimeout(connection);
    }, 42000);
  }

  sendHeardBeat(connection) {
    var msg = {
      op: 1,
      d: this.seq
    };
    console.log("heartbeat sent: " + JSON.stringify(msg));
    connection.sendUTF(JSON.stringify(msg));
  }

  closeConnection() {
    if (this.connection) {
      this.connection.drop();
    }
  }

  processMessage(msg) {
    if (this.onMessage) {
      this.onMessage(msg);
    }
    if (this.logMessages) {
      console.log(msg);
    }
  }
}

module.exports = WebSocketClient;
