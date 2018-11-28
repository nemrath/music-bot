const MeaningExtractor = require("./MeaningExtractor");
const Meaning = require("./Meanings");
const config = require("../config");
const Discord = require("discord.js");
const DiscordApi = require("./DiscordApi");
const Player = require("./Player");
const sleep = require("util").promisify(setTimeout);

class MusicBot {
    constructor() {
        this.client = new Discord.Client();
        this.player = new Player();
        this.textChannel = null;
        this.handleMessage = this.handleMessage.bind(this);
        this.handlePlayerError = this.handlePlayerError.bind(this);
        this.player.onError(this.handlePlayerError);
        this.connectToDiscord().catch(console.log);
    }

    async connectToDiscord() {
        await this.client.login(config.apiKey);
        this.client.on("message", this.handleMessage);
    }

    async handleMessage(message) {

        let meanings = await MeaningExtractor.extractMeanings(message);
        try {
            let results = await this.handleMeanings(meanings, message);
            // console.log(results);
        } catch (e) {
            await sleep(1000);
            message.reply(MusicBot.createErrorMessage(e));
        }

    }

    async handleMeanings(meanings, message) {
        let results = [];
        for (let meaning of meanings) {
            results.push(await this.handleMeaning(meaning, message));
        }
        return results;
    }

    async handleMeaning(meaning, message) {
        switch (meaning.type) {
            case Meaning.SHOW_PROFILE: {
                let content = JSON.stringify(await DiscordApi.getProfile());
                return await message.channel.send(MusicBot.createShortMessage("Profile:", content));
            }
            case Meaning.SHOW_QUEUE: {
                return await message.channel.send(this.createQueueMessage());
            }
            case Meaning.CLEAR_QUEUE: {
                this.player.clearQueue();
                return await message.channel.send(this.createQueueMessage());
            }
            case Meaning.PLAY_MUSIC: {

                if (!this.isInVoiceChannel()) {
                    await this.joinUsingMessage(message);
                }

                let result = this.player.playEnqueue(meaning.input);
                if (!result) {
                    // result = await message.reply("Couldnt play song");
                }
                return result;
            }
            case Meaning.NEXT_SONG: {
                let result = this.player.playNextInQueue();
                if (!result) {
                    result = await message.reply("Couldnt play song");
                } else {
                    result = await message.reply(this.createNowPlayingMessage());
                }
                return result;
            }
            case Meaning.PREVIOUS_SONG: {
                let result = this.player.playPreviousInQueue(this.player);
                console.log(this.player.playIndex);
                if (!result) {
                    result = await message.reply("Couldnt play song");
                } else {
                    result = await message.reply(this.createNowPlayingMessage());
                }
                return result;
            }
            case Meaning.PAUSE_MUSIC: {
                return this.player.pause();
            }
            case Meaning.RESUME_MUSIC: {
                return this.player.resume();
            }
            case Meaning.END_MUSIC: {
                return this.player.end();
            }
            case Meaning.LEAVE_VOICE_CHANNEL: {
                return this.leaveVoiceChannel();
            }
            case Meaning.JOIN_VOICE_CHANNEL: {
                return this.joinUsingMessage(message);
            }
            case Meaning.BOT_STARTED: {
                return await DiscordApi.sendMessage(
                    {
                        content: "I am awake"
                    },
                    config.logChannelId
                );
            }
        }
    }

    // setVoiceChannel(voiceChannel) {
    //     this.voiceChannel = voiceChannel;
    // }
    async joinVoiceChannel(voiceChannel) {
        this.voiceChannel = voiceChannel;
        let connection = await this.voiceChannel.join();

        if (connection) {
            this.player.setConnection(connection);
        }

        return connection;
    }

    async joinUsingMessage(message) {
        let result = null;
        if (message.member.voiceChannel) {
            let connection = await this.joinVoiceChannel(message.member.voiceChannel);
            if (connection) {
                result = await message.reply('I have successfully connected to the channel!');
            }
        } else {
            result = await message.reply('You need to join a voice channel first!');
        }
        this.setTextChannel(message.channel);
        return result;
    }

    leaveVoiceChannel() {
        this.voiceChannel.leave();
        this.voiceChannel = null;
    }

    setTextChannel(textChannel) {
        this.textChannel = textChannel;
    }

    handlePlayerError(error) {
        let message = MusicBot.createErrorMessage(error);
        if (this.textChannel) {
            this.textChannel.send(message);
        }
    }

    static createErrorMessage(e) {
        return new Discord.RichEmbed({
            // color: 0xFFFFEE,
            fields: [{
                name: "Error:",
                value: e.message ? e.message : JSON.stringify(e)
            }]
        })
    }

    createQueueString() {
        return this.player.getQueue().map((url, i) => {
            if (i === this.player.getPlayIndex()) {
                return '* ' + i + ". " + url;
            }
            return i + ". " + url;
        }).join("\n");
    }

    static createShortMessage(name, value) {
        return new Discord.RichEmbed({
            fields: [{
                name,
                value
            }]
        })
    }

    createQueueMessage() {

        let queueString = this.createQueueString();
        queueString = queueString ? queueString : "The queue is empty";
        let nowPlayingString = this.createNowPlayingString();
        nowPlayingString = nowPlayingString ? nowPlayingString : "Nothing is playing";
        return new Discord.RichEmbed({
            fields: [{
                name: "Queue:",
                value: queueString
            },
                {name: "Now playing:", value: nowPlayingString},
                {name: "playIndex:", value: this.player.getPlayIndex()}
            ]
        })
    }

    createNowPlayingString() {
        let song = this.player.getCurrentSong();
        if (song) {
            return this.player.getPlayIndex() + ". " + song.name;
        }
        return "";
    }

    createNowPlayingMessage() {
        return MusicBot.createShortMessage("Now playing:",
            this.player.getPlayIndex() + ". " + this.player.getCurrentSongName())
    }

    isInVoiceChannel() {
        return this.voiceChannel && true;
    }
}

module.exports = MusicBot;
