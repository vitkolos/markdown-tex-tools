const https = require('https');
const redis = require('redis');
const hash = require('object-hash');

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

function getKey(requestIdentifier) {
    const { type, url, options } = requestIdentifier;
    const optionsHash = hash(options);
    return [keyPrefix, type, url, optionsHash].join('_');
}

async function cacheRead(requestIdentifier, isBuffer = false) {
    if (redisClient) {
        try {
            const cmdOpts = redis.commandOptions({ returnBuffers: isBuffer });
            return await redisClient.get(cmdOpts, getKey(requestIdentifier));
        } catch (e) {
            console.error('cache read error', e);
        }
    }
}

function cacheWrite(requestIdentifier, data) {
    if (redisClient) {
        try {
            redisClient.set(getKey(requestIdentifier), data, {
                EX: 300 // keep for 5 minutes
            });
        } catch (e) {
            console.error('cache write error', e);
        }
    }
}

async function getContent(url, options, success, failure) {
    const cachedData = await cacheRead({ type: 'fileContent', url, options }, isBuffer = true);

    if (cachedData) {
        success(cachedData);
        return;
    } else {
        const badStatusCode = await cacheRead({ type: 'badStatusCode', url, options });

        if (badStatusCode) {
            failure('statusCode', badStatusCode);
            return;
        }
    }

    https.get(url, options, res => {
        const data = [];

        if (res.statusCode != 200) {
            failure('statusCode', res.statusCode);
            cacheWrite({ type: 'badStatusCode', url, options }, res.statusCode);
            return;
        }

        res.on('data', chunk => {
            data.push(chunk);
        });

        res.on('end', () => {
            const result = Buffer.concat(data);
            success(result);
            cacheWrite({ type: 'fileContent', url, options }, result);
        });
    }).on('error', err => {
        console.error('http error', err);
        failure('error', err);
    });
}

module.exports = { getContent, setupRedis };
