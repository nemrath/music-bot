const router = require("express-promise-router")();
const express = require("express");
const app = express();
const WebSocketClient = require("./WebSocketClient");
const DiscordApi = require("./DiscordApi");
let config = require("../config");

router.get("/", (req, res) => {
  res.send("Hello Exprejss app!");
});

app.use("/", router);
app.listen(8000, () => {
  console.log("server started  ");
});

const onMessage = async msg => {
  console.log("ukurkur");
  if (msg.t === "MESSAGE_CREATE") {
    let content = msg.d.content;
    // let result = await DiscordApi.sendMessage(
    //   {
    //     content
    //   },
    //   msg.d.channel_id
    // );
    // console.log(result);
  }
};
async function sendOnAwakeMessage() {
  let result = await DiscordApi.sendMessage(
    {
      content: "I am awake"
    },
    config.logChannelId
  );
  console.log(result);
}

if (config.logOnStartUp && config.logChannelId) {
  sendOnAwakeMessage();
}

new WebSocketClient({ onMessage, logMessages: true });
