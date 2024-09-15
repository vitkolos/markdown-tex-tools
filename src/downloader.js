const https = require('https');
const redis = require('redis');

const keyPrefix = 'mdtex';
var redisClient;

function setupRedis() {
    if (process.env.REDIS_URL) {
        redisClient = redis.createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (e) => {
            console.error('redis error', e);
        });
        redisClient.connect();
    }
}

function getKey(type, url) {
    return [keyPrefix, type, url].join('_');
}

async function cacheRead(type, url, isBuffer = false) {
    if (redisClient) {
        try {
            const options = redis.commandOptions({ returnBuffers: isBuffer });
            return await redisClient.get(options, getKey(type, url));
        } catch (e) {
            console.error('cache read error', e);
        }
    }
}

function cacheWrite(type, url, data) {
    if (redisClient) {
        try {
            redisClient.set(getKey(type, url), data, {
                EX: 10 // keep for 10 seconds
            });
        } catch (e) {
            console.error('cache write error', e);
        }
    }
}

async function getContent(url, options, success, failure) {
    const cachedData = await cacheRead('fileContent', url, isBuffer = true);

    if (cachedData) {
        console.log(url, 'found in cache');
        success(cachedData);
        return;
    } else {
        const badStatusCode = await cacheRead('badStatusCode', url);

        if (badStatusCode) {
            console.log(url, 'is error');
            failure('statusCode', badStatusCode);
            return;
        }

        console.log(url, 'fetched');
    }

    https.get(url, options, res => {
        const data = [];

        if (res.statusCode != 200) {
            cacheWrite('badStatusCode', url, res.statusCode);
            failure('statusCode', res.statusCode);
            return;
        }

        res.on('data', chunk => {
            data.push(chunk);
        });

        res.on('end', () => {
            const result = Buffer.concat(data);
            cacheWrite('fileContent', url, result);
            success(result);
        });
    }).on('error', err => {
        console.error('http error', err);
        failure('error', err);
    });
}

module.exports = { getContent, setupRedis };
