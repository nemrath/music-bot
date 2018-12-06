const YouTubeApi = require("./YouTubeApi");

class TrackSearcher {

    static async searchRelatedTracks(track) {
        if(track.youtubeId){
            let {results, ...rest} = await YouTubeApi.search(null, {relatedToVideoId: track.youtubeId});
            if (results.length) {
                return results.map(result => ({title: result.title, url: result.link}));
            }
        }

        return [];
    }

    static async search(query, opts = {}) {
        let {results, ...rest} = await YouTubeApi.search(query, opts);
        if (results.length) {
            return results.map(result => ({title: result.title, url: result.link}));
        }
        return [];
    }

}

module.exports = TrackSearcher;
