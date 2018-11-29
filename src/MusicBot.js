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
        this.handleEnqueue = this.handleEnqueue.bind(this);
        this.handleTrackStart = this.handleTrackStart.bind(this);
        this.player.onError(this.handlePlayerError);
        this.player.onEnqueue(this.handleEnqueue);
        this.player.onTrackStart(this.handleTrackStart);
        this.connectToDiscord().catch(console.log);
    }

    async connectToDiscord() {
        await this.client.login(config.apiKey);
        this.client.on("message", this.handleMessage);
    }

    async handleMessage(message) {

        let meanings = await MeaningExtractor.extractMeanings(message);
        try {
            await this.handleMeanings(meanings, message);
        } catch (e) {
            await sleep(1000);
            message.reply(MusicBot.createErrorMessage(e));
            throw e;
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
            case Meaning.SEARCH_TRACK: {
                let tracks = await Player.search(meaning.query);
                if (tracks.length) {
                    this.waitingForSearchResultChoice = true;
                    this.searchResults = tracks;
                }

                return await message.channel.send(MusicBot.createSearchResultsMessage(tracks));
            }
            case Meaning.JUMP_TO_TRACK: {
                let trackNumber = parseInt(meaning.trackNumber);
                if (trackNumber >= 0 && trackNumber < this.player.getQueue().length) {

                    if (!this.isInVoiceChannel()) {
                        if (!await this.joinUsingMessage(message)) {
                            return;
                        }
                    }
                    return this.player.jumpTo(trackNumber);
                }
                break;
            }
            case Meaning.PLAY_CURRENT_TRACK: {

                if (this.player.getQueue().length > 0) {
                    return this.player.playCurrentTrack();
                }

                if (this.textChannel) {
                    return this.textChannel.send(MusicBot.createShortMessage("Warning", "Nothing is queued"));
                }

                return false;
            }
            case Meaning.CANCEL: {
                this.waitingForSearchResultChoice = false;
                this.searchResults = null;
                if (this.textChannel) {
                    this.textChannel.send(MusicBot.createShortMessage("Search status:", "canceled"));
                }
                break;
            }
            case Meaning.STATUS: {
                return message.reply(MusicBot.createShortMessage("Player status:", JSON.stringify(this.player.getStatus())));
            }
            case Meaning.NUMBER_ENTERED: {
                if (this.waitingForSearchResultChoice) {
                    if (meaning.number >= 0 && meaning.number < this.searchResults.length) {

                        if (!this.isInVoiceChannel()) {
                            if (!await this.joinUsingMessage(message)) {
                                return;
                            }
                        }

                        let result = this.player.playEnqueue(this.searchResults[meaning.number].url);
                        this.waitingForSearchResultChoice = false;
                        this.searchResults = null;
                        return result;
                    }
                }
                break;
            }
            case Meaning.SHOW_NOW_PLAYING: {
                if (this.textChannel) {
                    return await this.textChannel.send(this.createNowPlayingMessage(true));
                }
                break;
            }
            case Meaning.PLAY_MUSIC: {

                if (!this.isInVoiceChannel()) {
                    if (!await this.joinUsingMessage(message)) {
                        return;
                    }
                }

                return this.player.playEnqueue(meaning.input);
            }
            case Meaning.NEXT_TRACK: {
                let result = this.player.playNextInQueue();
                if (!result) {
                    result = await message.reply("Couldnt play track");
                }
                return result;
            }
            case Meaning.PREVIOUS_TRACK: {
                let result = this.player.playPreviousInQueue(this.player);
                console.log(this.player.playIndex);
                if (!result) {
                    result = await message.reply("Couldnt play track");
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
                return this.player.stop();
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

        if (message.member.voiceChannel) {
            let connection = await this.joinVoiceChannel(message.member.voiceChannel);
            if (!connection) {
                throw Error("could not join the voice channel");
            }
        } else {
            await message.reply('You need to join a voice channel first!');
            return false;
        }

        this.setTextChannel(message.channel);
        return message.reply('I have successfully connected to the channel!');
    }

    leaveVoiceChannel() {
        this.player.stop();

        if (this.voiceChannel) {
            this.voiceChannel.leave();
        }

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
        return this.player.getQueue().map((track, i) => {
            if (i === this.player.getPlayIndex()) {
                return "* " + i + ". " + '[' + track.title + '](' + track.url + ')';
            }
            return i + ". " + '[' + track.title + '](' + track.url + ')';
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
                {name: "Now playing:", value: nowPlayingString}
            ]
        })
    }

    createNowPlayingString() {
        let track = this.player.getCurrentTrack();
        if (track) {
            return this.player.getPlayIndex() + ". " + '[' + track.title + '](' + track.url + ')';
        }
        return "";
    }

    createCurrentTrackTimeString() {
        let progress = this.player.getCurrentTrackProgress();
        let duration = this.player.getCurrentTrackDuration();
        if (progress && duration) {
            return progress + "/" + duration;
        }
        return false;
    }

    createNowPlayingMessage(withTime = false) {
        let time = "";
        if (withTime && this.createCurrentTrackTimeString()) {
            time = " " + this.createCurrentTrackTimeString();
        }
        return MusicBot.createShortMessage("Now playing:",
            this.createNowPlayingString() + time)
    }

    isInVoiceChannel() {
        return this.voiceChannel && true;
    }

    handleEnqueue(tracks) {
        if (this.textChannel) {
            let message = tracks.length + " tracks enqued. Currently at: " + this.player.getPlayIndex() + "/" + (this.player.getQueue().length - 1) + ".";
            this.textChannel.send(MusicBot.createShortMessage("Tracks enqueued", message));
        }
    }

    handleTrackStart() {
        if (this.textChannel) {
            this.textChannel.send(this.createNowPlayingMessage());
        }
    }

    static createSearchResultsString(tracks) {
        return tracks.map((track, i) => {
            return i + ". " + '[' + track.title + '](' + track.url + ')';
        }).join("\n");
    }

    static createSearchResultsMessage(tracks) {
        let resultsString = MusicBot.createSearchResultsString(tracks);
        resultsString = resultsString ? resultsString : "Try a different query.";
        return new Discord.RichEmbed({
            title: tracks.length ? "Choose a number or type " + config.commandPrefix + "cancel to cancel:" : "No results found",
            fields: [{
                name: "Results:",
                value: resultsString
            }
            ]
        })
    }
}

module.exports = MusicBot;
