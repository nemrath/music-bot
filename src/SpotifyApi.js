const config = require("../config");
const sleep = require('util').promisify(setTimeout);

class SpotifyApi {
    static async callApi(body, url, method, apiKey = SpotifyApi.bearerKey, withTokenRefresh = true) {
        let headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers["Authorization"] = "Bearer " + apiKey;
        }
        let result = await fetch(url, {
            method: method,
            body: method !== 'GET' ? JSON.stringify(body) : null,
            headers: headers,
        }).then(response => {
            if (response.status === 204) {
                return {http_status_code: 204};
            }
            return response.json();
        });

        if (result.error && withTokenRefresh) {

            if((Date.now() > SpotifyApi.getKeyExpirationDate())){
                let {token, expires_in} = await SpotifyApi.getToken();
                if (token && expires_in) {
                    SpotifyApi.bearerKey = result.token;
                    let t = new Date();
                    t.setSeconds(t.getSeconds() + expires_in);
                    SpotifyApi.setKeyExpirationDate(t);

                    return SpotifyApi.callApi(null, url, 'GET', SpotifyApi.bearerKey, false);
                }
            }

            throw Error("Could not get spotify token");
        }
        return result;
    }

    static getToken() {
        let form = new FormData();
        form.append('grant_type', "client_credentials");
        let headers = {
            Authorization: "Basic " + Buffer.from(config.spotifyClientID + ":" + config.spotifySecret).toString('base64'),
        };
        return fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            body: form,
            headers: headers,
        }).then(response => response.json());
    }

    static async getTrack(trackId, apiKey = SpotifyApi.bearerKey) {
        let url = config.spotifyApiUrl + '/tracks/' + trackId;
        return SpotifyApi.callApi(null, url, 'GET', apiKey);
    }

    static async getUser(apiKey = SpotifyApi.bearerKey) {
        let url = config.spotifyApiUrl + '/me';
        return SpotifyApi.callApi(null, url, 'GET', apiKey);
    }

    static async getPlaylists(apiKey = SpotifyApi.bearerKey) {
        let url = config.spotifyApiUrl + '/me/playlists'
        return SpotifyApi.callApi(null, url, 'GET', apiKey);
    }

    static async getPlaylistTracks(playlistId, apiKey = SpotifyApi.bearerKey) {
        let url = config.spotifyApiUrl + '/playlists/' + playlistId + '/tracks';
        return SpotifyApi.callApi(null, url, 'GET', apiKey);
    }

    static async createPlayList(userId, name, apiKey = SpotifyApi.bearerKey) {
        let url = config.spotifyApiUrl + '/users/' + userId + '/playlists';
        return SpotifyApi.callApi({name: name, public: false}, url, 'POST', apiKey);
    }

    static async addTracks(playlistId, tracks, apiKey = SpotifyApi.bearerKey) {
        let url = config.spotifyApiUrl + '/playlists/' + playlistId + '/tracks';
        return SpotifyApi.callApi({uris: tracks.map(track => track.track.uri)}, url, 'POST', apiKey);
    }

    static async syncPlaylists(sourceApiKey, targetApiKey) {
        if (!(sourceApiKey && targetApiKey)) {
            throw Error('need source and target api key');
        }
        let results = [];
        let {id: targetUserId} = await SpotifyApi.getUser(targetApiKey);
        await sleep(1000);
        let {items: sourcePlaylists} = await SpotifyApi.getPlaylists(sourceApiKey);
        await sleep(1000);
        for (let {id: playlistId, name} of sourcePlaylists) {
            let {id: targetPlaylistID, ...other} = await SpotifyApi.createPlayList(targetUserId, name, targetApiKey);
            await sleep(1000);
            let {items, next} = await SpotifyApi.getPlaylistTracks(playlistId, sourceApiKey);
            await sleep(1000);
            let tracks = items;
            while (next) {
                ({items, next} = await SpotifyApi.callApi(null, next, 'GET', sourceApiKey));
                tracks.push(...items);
                await sleep(1000);
            }
            await sleep(1000);

            let remainingTracks = tracks;
            while (remainingTracks.length > 0) {
                let tracksBatch = remainingTracks.slice(0, 100);
                remainingTracks = remainingTracks.slice(100);
                let result = await SpotifyApi.addTracks(targetPlaylistID, tracksBatch, targetApiKey);
                results.push(result);
                await sleep(1000);
            }
        }
        return results;
    }


    static getKeyExpirationDate() {
        return SpotifyApi.expirationDate ? SpotifyApi.expirationDate : 0;
    }

    static setKeyExpirationDate(t) {
        SpotifyApi.expirationDate = t;
    }
}

module.exports = SpotifyApi;
