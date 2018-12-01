const ytdl = require('ytdl-core');
const config = require("../config");
const SpotifyApi = require("./SpotifyApi");
const ytSearch = require("youtube-search");
const YouTubeApi = require("./YouTubeApi");

class PlayerEvent {

}

PlayerEvent.NEXT_SONG_PLAYED = "NEXT_SONG_PLAYED";
PlayerEvent.PLAYER_STOPPED = "PLAYER_STOPPED";
PlayerEvent.PREVIOUS_SONG_PLAYED = "PREVIOUS_SONG_PLAYED";
PlayerEvent.CURRENT_SONG_PLAYED = "CURRENT_SONG_PLAYED";

class InputType {

}

InputType.YOUTUBE_TRACK_LINK = "YOUTUBE_TRACK_LINK";
InputType.SPOTIFY_TRACK_LINK = "SPOTIFY_TRACK_LINK";
InputType.YOUTUBE_PLAYLIST_LINK = "YOUTUBE_PLAYLIST_LINK";
InputType.SPOTIFY_PLAYLIST_LINK = "SPOTIFY_PLAYLIST_LINK";

class Player {

    constructor() {
        this.END_REASON_NEXT_SONG = "END_REASON_NEXT_SONG";
        this.onEnd = this.onEnd.bind(this);
        this.onError = this.onError.bind(this);
        this.handleEnd = this.handleEnd.bind(this);
        this.handleError = this.handleError.bind(this);
        this.playPreviousInQueue = this.playPreviousInQueue.bind(this);
        this.playIndex = -1;
        this.queue = [];
    }

    async getTracks(input) {
        let linkType = this.parseInput(input);
        switch (linkType) {
            case InputType.YOUTUBE_TRACK_LINK:
                return [await this.getYouTubeTrack(input)];
            case InputType.YOUTUBE_PLAYLIST_LINK:
                return this.getYoutubeTracks(input);
            case InputType.SPOTIFY_TRACK_LINK:
                return [await this.getSpotifyTrack(input)];
            case InputType.SPOTIFY_PLAYLIST_LINK:
                return this.getSpotifyTracks(input);
            default:
                throw Error("unknown input");
        }
    }

    async play(track) {
        let result;
        switch (track.urlType) {
            case InputType.YOUTUBE_TRACK_LINK:
                result = this.playYouTubeTrack(track.url);
                break;
            case InputType.SPOTIFY_TRACK_LINK:
                result = this.playSpotifyTrack(track.url);
                break;
            default:
                throw Error("unknown input");
        }
        this.handleTrackStart(track);
        return result;
    }

    playYouTubeTrack(youtubeLink = 'https://www.youtube.com/watch?v=52-OszXrQwU') {
        let stream = ytdl(youtubeLink,
            {filter: 'audioonly'});
        let dispatcher = this.playStream(stream);
        return new Promise((resolve, reject) => {
            stream.on('info', info => {
                resolve(info);
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

    async playEnqueue(input) {

        let tracks = await this.getTracks(input);
        this.queue.push(...tracks);

        if (this.notPlaying()) {
            await this.playNextInQueue();
            if (tracks.length > 1) {
                this.handleEnqueue(tracks);
            }
        } else {
            this.handleEnqueue(tracks);
        }

        return tracks;
    }

    onTrackStart(callback) {
        this.onTrackStartCallback = callback;
    }

    onEnqueue(callback) {
        this.onEnqueueCallback = callback;
    }

    onEnd(callback) {
        this.endCallback = callback;
    }

    onError(callback) {
        this.errorCallback = callback;
    }

    handleEnd(reason) {
        this.dispatcher = null;
        if (this.endCallback) {
            this.endCallback(reason);
        }
        if (Player.autoEnded(reason) && this.hasNextInQueue()) {
            this.playNextInQueue();
        }

    }

    handleError(error) {
        if (this.errorCallback) {
            this.errorCallback(error);
        }
    }

    playNextInQueue() {
        if (this.playIndex + 1 < this.queue.length) {

            if (this.dispatcher) {
                this.dispatcher.end(PlayerEvent.NEXT_SONG_PLAYED);
            }

            this.playIndex += 1;
            return this.play(this.queue[this.playIndex]);
        }
    }

    playPreviousInQueue() {
        if ((this.playIndex - 1) >= 0) {

            if (this.dispatcher) {
                this.dispatcher.end(PlayerEvent.PREVIOUS_SONG_PLAYED);
            }

            this.playIndex = this.playIndex - 1;
            if (this.playIndex < this.queue.length) {
                return this.play(this.queue[this.playIndex]);
            }
        }
    }

    getQueue() {
        return this.queue;
    }

    getPlayIndex() {
        return this.playIndex;
    }

    clearQueue() {
        this.queue = [];
        this.playIndex = -1;
    }

    getCurrentTrack() {
        let track = this.queue[this.getPlayIndex()];
        if (track) {
            return {...track, time: this.getCurrentTrackProgress()};
        }
        return false;
    }

    getCurrentTrackTitle() {
        let track = this.getCurrentTrack();
        return track ? track.title : null;
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
        return input.startsWith(config.spotifyBaseUrl + "/track/");
    }

    static isYoutubePlaylistLink(input) {
        return input.startsWith("https://www.youtube.com/playlist?list=");
    }

    static isSpotifyPlaylistLink(input) {
        return input.startsWith(config.spotifyBaseUrl + "/playlist/");
    }

    notPlaying() {
        return !this.dispatcher;
    }

    handleEnqueue(tracks) {
        if (this.onEnqueueCallback) {
            this.onEnqueueCallback(tracks);
        }
    }

    hasNextInQueue() {
        return this.playIndex + 1 < this.queue.length;
    }

    handleTrackStart(track) {
        if (this.onTrackStartCallback) {
            this.onTrackStartCallback(track);
        }
    }

    async getSpotifyTracks(input) {
        let playlist = await SpotifyApi.getPlaylistTracks(input.replace(config.spotifyBaseUrl + "/playlist/", ""));
        let tracks = playlist.items.map(({track}) => Player.formatSpotifyTrack(track));
        return await Promise.all(tracks.map(track => Player.searchTracksInYoutube(track)));
    }

    static formatSpotifyTrack(track) {
        return {
            name: track.name,
            artists: track.artists.map(({name}) => name),
            duration: track.duration_ms / 1000,
        };
    }

    static async searchTracksInYoutube(track) {
        var opts = {
            maxResults: 3,
            key: config.googleApiKey,
            type: 'video'
        };
        let searchString = track.artists.join(" ") + " " + track.name;
        let {results, ...rest} = await ytSearch(searchString, opts);
        if (results.length) {
            return {
                ...track,
                title: results[0].title,
                url: results[0].link,
                urlType: InputType.YOUTUBE_TRACK_LINK,
                thumbnail: results[0].thumbnails ? results[0].thumbnails.default: null
            };
        }
        return {...track, title: searchString, url: null};
    }

    stop() {
        this.connection = null;
        if (this.dispatcher) {
            this.dispatcher.end(PlayerEvent.PLAYER_STOPPED);
        }
    }

    static async search(query) {
        var opts = {
            maxResults: 10,
            key: config.googleApiKey,
            type: 'video'
        };
        let {results, ...rest} = await ytSearch(query, opts);
        if (results.length) {
            return results.map(result => ({title: result.title, url: result.link}));
        }
        return [];
    }

    async getYouTubeTrack(input) {
        let result = await ytdl.getInfo(input);
        return Player.formatYoutubeResult(result);
    }

    static formatYoutubeResult(result) {
        return {
            title: result.title,
            duration: parseInt(result.length_seconds),
            thumbnail: {url:result.thumbnail_url},
            url: result.video_url,
            urlType: InputType.YOUTUBE_TRACK_LINK,
        };
    }

    static formatYoutubePlaylistItemResult(result) {
        return {
            title: result.title,
            url: 'https://www.youtube.com/watch?v=' + result.resourceId.videoId,
            urlType: InputType.YOUTUBE_TRACK_LINK,
            thumbnail: result.thumbnails ? result.thumbnails.default : null
        };
    }
    static autoEnded(reason) {
        return !([
            PlayerEvent.NEXT_SONG_PLAYED,
            PlayerEvent.PLAYER_STOPPED,
            PlayerEvent.PREVIOUS_SONG_PLAYED,
            PlayerEvent.CURRENT_SONG_PLAYED
        ].includes(reason));
    }

    getCurrentTrackProgress() {
        return this.dispatcher ? Math.round(this.dispatcher.time / 1000) : null;
    }

    getCurrentTrackDuration() {
        let track = this.getCurrentTrack();
        if (track) {
            return track.duration;
        }
        return false;
    }

    jumpTo(trackNumber) {
        if (trackNumber >= 0 && trackNumber < this.getQueue().length) {
            this.playIndex = trackNumber;
            return this.playCurrentTrack()
        }
        return undefined;
    }

    playCurrentTrack() {

        if (this.dispatcher) {
            this.dispatcher.end(PlayerEvent.CURRENT_SONG_PLAYED);
        }

        if (this.queue.length > 0) {
            return this.play(this.queue[this.playIndex]);
        }

        return false;

    }

    getStatus() {
        let statusMap = {
            0: "CONNECTED",
            1: "CONNECTING",
            2: "AUTHENTICATING",
            3: "RECONNECTING",
            4: "DISCONNECTED",
        };
        return {
            hasVoiceConnection: !!this.connection,
            voiceConnectionStatus: this.connection ? statusMap[this.connection.status] : "no voice connection",
            dispatcherStatus: this.dispatcher ? (this.dispatcher.destroyed ? "destroyed" : "not destroyed") : "no dispatcher"
        };
    }

    async getYoutubeTracks(input) {
        let id = input.replace("https://www.youtube.com/playlist?list=", "");
        let playlist =  await YouTubeApi.getPLaylist(id);
        if(playlist) {
            return playlist.items.map(result => Player.formatYoutubePlaylistItemResult(result.snippet));
        }
        return false;

    }

    async getSpotifyTrack(input) {
        let track = await SpotifyApi.getTrack(input.replace(config.spotifyBaseUrl + "/track/", ""));
        return Player.searchTracksInYoutube(Player.formatSpotifyTrack(track));
    }
}

module.exports = Player;
