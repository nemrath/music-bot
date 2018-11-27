const fetch = require('node-fetch');
const base64stream = require('base64-stream');

class NetworkService {

    static async callApi(body, url, method, key ) {
        let headers =  {
            'Content-Type': 'application/json'
        };
        if(key) {
            headers["authorization"] = key;
        }
        return fetch(url, {
            method: method,
            body: method !== 'GET' ? JSON.stringify(body) : null,
            headers: headers,
        }).then(response => {
            if (response.status === 204) {
                return {http_status_code: 204};
            }
            return response.json();
        });
    }


    static callApiRaw(rawMessage, url, key, contentType = 'application/json') {
        let headers = {
            authorization: key,
        };
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return fetch(url, {
            method: 'POST',
            body: rawMessage,
            headers: headers,
        }).then(response => response.json());
    }

    static async  getBase64Data(url) {
        return fetch(url)
            .then((res) => {
                return new Promise((resolve, reject) => {
                    let chunks = [];
                    let myStream = res.body.pipe(base64stream.encode());
                    myStream.on('data', (chunk) => {
                        chunks = chunks.concat(chunk);
                    });
                    myStream.on('end', () => {
                        resolve(chunks.toString('base64'));
                    });
                });
            });
    }

}

module.exports = NetworkService;
