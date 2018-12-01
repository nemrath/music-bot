const config = require("../config");
const sleep = require('util').promisify(setTimeout);
const fetch = require('node-fetch');
class YouTubeApi {
    static async callApi(route, method, data, apiKey = config.googleApiKey) {
        return await fetch("https://www.googleapis.com/youtube/v3" + route + '&key=' +  apiKey , {
            method: method,
            body: method !== 'GET' ? JSON.stringify(data) : null,
        }).then(response => {
            return response.json();
        });
    }

    static getPLaylist(id){
        return YouTubeApi.callApi('/playlistItems?part=snippet&maxResults=50&playlistId=' +id);
    }
}

module.exports = YouTubeApi;
