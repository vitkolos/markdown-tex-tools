const https = require('https');

function getContent(url, options, success, failure) {
    https.get(url, options, res => {
        const data = [];

        if (res.statusCode != 200) {
            failure('statusCode', res.statusCode);
            return;
        }

        res.on('data', chunk => {
            data.push(chunk);
        });

        res.on('end', () => {
            success(Buffer.concat(data));
        });
    }).on('error', err => {
        failure('error', err);
    });
}

module.exports = { getContent };
