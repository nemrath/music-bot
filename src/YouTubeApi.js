const config = require("../config");
const fetch = require('node-fetch');
const querystring = require('querystring');

class YouTubeApi {

    static async callApi(route, method, data, apiKey = config.googleApiKey) {
        return await fetch(config.youtubeApiUrl + route + '&key=' + apiKey, {
            method: method,
            body: method !== 'GET' ? JSON.stringify(data) : null,
        }).then(response => {
            return response.json();
        });
    }

    static getPLaylist(id) {
        return YouTubeApi.callApi('/playlistItems?part=snippet&maxResults=50&playlistId=' + id);
    }

    static async search(query, options = {}) {

        let defaultOptions = {
            part: 'snippet',
            maxResults: 50,
            key: config.googleApiKey,
            type: 'video',
        };

        if(query){
            options.query = query;
        }

        options = {...defaultOptions, ...options};

        return YouTubeApi.callApi('/search?' + querystring.stringify(options));
    }

}

module.exports = YouTubeApi;
