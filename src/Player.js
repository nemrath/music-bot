const ytdl = require('ytdl-core');
const config = require("../config");


class InputType {

}

InputType.YOUTUBE_TRACK_LINK = "YOUTUBE_TRACK_LINK";
InputType.SPOTIFY_TRACK_LINK = "SPOTIFY_TRACK_LINK";
InputType.YOUTUBE_PLAYLIST_LINK = "YOUTUBE_PLAYLIST_LINK";
InputType.SPOTIFY_PLAYLIST_LINK = "SPOTIFY_PLAYLIST_LINK";

class Player {

    constructor() {
        this.spotify
        this.onEnd = this.onEnd.bind(this);
        this.onError = this.onError.bind(this);
        this.handleEnd = this.handleEnd.bind(this);
        this.handleError = this.handleError.bind(this);
        this.playPreviousInQueue = this.playPreviousInQueue.bind(this);
        this.playIndex = -1;
        this.connectToSpotify();
        this.queue = [];
    }

    connectToSpotify() {

        const username = config.spotifyUsername;
        const password = config.spotifyPassword;

        Spotify.login(username, password, (err, spotify) => {
            if (err) throw err;
            this.spotify = spotify;
        });
    }

    getTracks(input) {
        let linkType = this.parseInput(input);
        switch (linkType) {
            case InputType.YOUTUBE_TRACK_LINK:
                return this.playYouTubeTrack(input);
            case InputType.SPOTIFY_TRACK_LINK:
                return this.playSpotifyTrack(input);
            default:
                throw Error("unknown input");
        }
    }

    async play(input) {
        let linkType = this.parseInput(input);
        let track = null;
        switch (linkType) {
            case InputType.YOUTUBE_TRACK_LINK:
                track = await this.playYouTubeTrack(input);
                break;
            case InputType.SPOTIFY_TRACK_LINK:
                track = await this.playSpotifyTrack(input);
                break;
            default:
                throw Error("unknown input");
        }
        this.handleTrackStart(track);
        return track;
    }

    playYouTubeTrack(youtubeLink = 'https://www.youtube.com/watch?v=52-OszXrQwU') {
        let stream = ytdl(youtubeLink,
            {filter: 'audioonly'});
        let dispatcher = this.playStream(stream);
        return new Promise((resolve, reject) => {
            stream.on('info', info => {
                resolve([info]);
            });
        });

    }

    async playSpotifyTrack(spotifyLink = 'https://open.spotify.com/track/5k4sO8x7TS1iiCO83Y61iw') {
        let route = spotifyLink.replace("https://open.spotify.com", "");
        if (route.startsWith("/track/")) {
            let trackId = route.replace("/track/", "");
            return [await SpotifyApi.getTrack(trackId)];
        }
    }

    setConnection(connection) {
        this.connection = connection;
    }

    playStream(stream) {
        const dispatcher = this.connection.playStream(stream);
        this.setDispatcher(dispatcher);
        return dispatcher;
    }

    setDispatcher(dispatcher) {
        this.dispatcher = dispatcher;
        dispatcher.on('end', this.handleEnd);
        dispatcher.on('error', this.handleError);
    }

    pause() {
        this.dispatcher.pause();
    }

    resume() {
        this.dispatcher.resume();
    }

    end() {
        this.dispatcher.end();
    }

    async playEnqueue(input) {

        if (Player.notPlaying() && Player.isYoutubeTrackLink(input)) {
            let track = await this.play(input);
            this.queue.push(track);
            this.playIndex +=1;
            return [track];
        } else {
            let tracks = await this.getTracks(input);
            this.queue.push(...tracks);
            this.handleEnqueue(tracks);
            if(Player.notPlaying()){
                await this.playNextInQueue();
            }
            return tracks;

        }


    }

    onTrackStart(callback) {
        this.onTrackStartCallback = callback;
    }

    onEnqueue(callback){
        this.onEnqueueCallback = callback;
    }

    onEnd(callback) {
        this.endCallback = callback;
    }

    onError(callback) {
        this.errorCallback = callback;
    }

    handleEnd(e) {
        if (this.endCallback) {
            this.endCallback();
        }
        if(this.hasNextInQueue()){
            this.playNextInQueue();
        } else {
            this.dispatcher = null;
        }

    }

    handleError(error) {
        if (this.errorCallback) {
            this.errorCallback(error);
        }
    }

    playNextInQueue() {
        if (this.playIndex + 1 < this.queue.length) {
            this.playIndex += 1;
            return this.play(this.queue[this.playIndex].url);
        }
    }

    playPreviousInQueue() {
        if ((this.playIndex - 1) >= 0) {
            this.playIndex = this.playIndex - 1;
            if (this.playIndex < this.queue.length) {
                return this.play(this.queue[this.playIndex].url);
            }
        }
        console.log(this.playIndex);
    }

    getQueue() {
        return this.queue;
    }

    getPlayIndex() {
        return this.playIndex;
    }

    clearQueue() {
        this.queue = [];
        this.playIndex = 0;
    }

    getCurrentTrack() {
        let track = this.queue[this.getPlayIndex()];
        if (track) {
            return {...track, time: this.getCurrentTrackTime() } ;
        }
        return false;
    }

    getCurrentTrackName() {
        let track = this.getCurrentTrack();
        return track ? track.name : null;
    }

    parseInput(input) {
        if (Player.isYoutubeTrackLink(input)) {
            return InputType.YOUTUBE_TRACK_LINK;
        }
        if (Player.isSpotifyTrackLink(input)) {
            return InputType.SPOTIFY_TRACK_LINK;
        }
        if (Player.isYoutubePlaylistLink(input)) {
            return InputType.YOUTUBE_PLAYLIST_LINK;
        }
        if (Player.isSpotifyPlaylistLink(input)) {
            return InputType.SPOTIFY_PLAYLIST_LINK;
        }
        return false;
    }

    static isYoutubeTrackLink(input) {
        return ytdl.validateURL(input);
    }

    static isSpotifyTrackLink(input) {
        return input.startsWith(config.spotifyTrackBaseUrl + "/track/");
    }

    static isYoutubePlaylistLink(input) {
        return ytdl.validateURL(input);
    }

    static isSpotifyPlaylistLink(input) {
        return input.startsWith(config.spotifyTrackBaseUrl + "/playlist/");
    }

    static notPlaying() {
        return !this.dispatcher;
    }

    handleEnqueue(tracks){
        if(this.onEnqueueCallback){
            this.onEnqueueCallback(tracks);
        }
    }

    hasNextInQueue() {
        return this.playIndex + 1 < this.queue.length;
    }

    handleTrackStart(track) {
        if(this.onTrackStartCallback){
            this.onTrackStartCallback(track);
        }
    }

    getCurrentTrackTime() {
        return this.dispatcher ? this.dispatcher.time : null;
    }
}

module.exports = Player;
