const ytdl = require('ytdl-core');

class LINK_TYPE {

}

LINK_TYPE.YOUTUBE = "YOUTUBE";

class Player {
    constructor() {
        this.onEnd = this.onEnd.bind(this);
        this.onError = this.onError.bind(this);
        this.handleEnd = this.handleEnd.bind(this);
        this.handleError = this.handleError.bind(this);
        this.playPreviousInQueue = this.playPreviousInQueue.bind(this);
        this.playIndex = 0;
        this.queue = [];
    }

    play(input) {
        let linkType = LINK_TYPE.YOUTUBE;
        switch (linkType) {
            case LINK_TYPE.YOUTUBE:
                return this.playYouTube(input);
            default:
                return this.playYouTube(input);
        }
    }

    playYouTube(youtubeLink = 'https://www.youtube.com/watch?v=52-OszXrQwU') {
        let stream = ytdl(youtubeLink,
            {filter: 'audioonly'});
        let dispatcher = this.playStream(stream);
        return {stream, paused: dispatcher.paused};
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

    playEnqueue(input) {
        this.queue.push(input);
        if (this.playIndex === this.queue.length - 1) {
            return this.play(this.queue[this.playIndex]);
        }
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
        this.playNextInQueue();
    }

    handleError(error) {
        if (this.errorCallback) {
            this.errorCallback(error);
        }
    }

   playNextInQueue() {
        if (this.playIndex + 1 < this.queue.length) {
            this.playIndex += 1;
            return this.play(this.queue[this.playIndex]);
        }
    }

    playPreviousInQueue() {
        if ((this.playIndex - 1) >= 0) {
            this.playIndex = this.playIndex  - 1;
            if (this.playIndex < this.queue.length) {
                return this.play(this.queue[this.playIndex]);
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

    getCurrentSong() {
        let song = this.queue[this.getPlayIndex()];
        if (song) {
            return {
                name: song,
                url: song
            }
        }
        return false;
    }

    getCurrentSongName() {
        let song = this.getCurrentSong();
        return song ? song.name : null;
    }
}

module.exports = Player;
