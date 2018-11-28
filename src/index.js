const router = require("express-promise-router")();
const express = require("express");
const app = express();
const WebSocketClient = require("./WebSocketClient");
const MeaningExtractor = require("./MeaningExtractor");
const MeaningHandler = require("./MeaningHandler");
const Meaning = require("./Meanings");
const config = require("../config");
const ytdl = require('ytdl-core');

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

// new WebSocketClient({ onMessage, logMessages: false });
const Discord = require("discord.js");
const client = new Discord.Client();

client.login(config.apiKey);

client.on("message", async message => {
    // Voice only works in guilds, if the message does not come from a guild,
    // we ignore it
    if (!message.guild) return;

    if (message.content === config.commandPrefix + "join") {
       // console.log(message.member);
        if (message.member.voiceChannel) {
            let connection = await message.member.voiceChannel.join()
                .catch(console.log);
            if(connection) {
                message.reply('I have successfully connected to the channel!');
                const dispatcher = connection.playStream(ytdl(
                    'https://www.youtube.com/watch?v=52-OszXrQwU',
                    // 'https://www.youtube.com/watch?v=ZlAU_w7-Xp8',
                    { filter: 'audioonly' }));
                dispatcher.on('end', e => {
                  console.log("song finished");
                });

                dispatcher.on('error', e => {
                    // Catch any errors that may arise
                    console.log(e);
                });

                dispatcher.setVolume(0.5); // Set the volume to 50%
                dispatcher.setVolume(1); // Set the volume back to 100%

                console.log(dispatcher.time); // The time in milliseconds that the stream dispatcher has been playing for
            }
        } else {
            message.reply('You need to join a voice channel first!');
        }
    }
});
