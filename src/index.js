const router = require("express-promise-router")();
const express = require("express");
const app = express();
const WebSocketClient = require("./WebSocketClient");
const MeaningExtractor = require("./MeaningExtractor");
const MeaningHandler = require("./MeaningHandler");
const Meaning = require("./Meanings");
const DiscordApi = require("./DiscordApi");

const sleep = require("util").promisify(setTimeout);
let config = require("../config");

router.get("/", (req, res) => {
  res.send("Hello Express app!");
});

app.use("/", router);
app.listen(8000, () => {
  console.log("server started");
});

const onMessage = async msg => {
  let meanings = await MeaningExtractor.extractMeanings(msg);
  let results = await MeaningHandler.handleMeanings(meanings, msg);
};

if (config.logOnStartUp && config.logChannelId) {
  MeaningHandler.handleMeaning(Meaning.BOT_STARTED);
}

new WebSocketClient({ onMessage, logMessages: false });
