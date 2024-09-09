// in order to add npm package: docker exec -it node /bin/sh
// debugging: docker logs node

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const markview = require('./src/markview');
const static = require('./src/static');
const { notFound } = require('./src/notfound');
const sideSeps = new RegExp(`^${path.sep}|${path.sep}$`, 'g');

const requestListener = function (req, res) {
    const stopwatchStart = performance.now();
    const logFile = fs.createWriteStream(__dirname + '/access.log', { flags: 'a' });

    // where the real path starts; e.g. /node/ = 1, /script/node/app/ = 3
    const pathOffset = 1;
    const parsedUrl = url.parse(req.url);
    const urlParts = parsedUrl.pathname.replace(sideSeps, '').split(path.sep);
    const mode = urlParts[pathOffset];
    const request = {
        req,
        url: parsedUrl,
        prefix: path.sep + urlParts.slice(0, pathOffset).join(path.sep),
        mode,
        localPath: urlParts.slice(pathOffset + 1).join(path.sep),
        urlParts,
        pathOffset
    };

    switch (mode) {
        case 'view':
        case 'source':
            markview.getView(request, pathOffset + 1, res, mode);
            break;

        case 'cards':
        case 'anki':
        case 'quizlet':
        case 'cards-json':
            markview.getView(request, pathOffset + 1, res, 'cards');
            break;

        case 'static':
            static.getFile(request, res);
            break;

        default:
            notFound(res, 'Mode not found');
            break;
    }

    res.on('finish', function () {
        const stopwatchEnd = performance.now();
        const date = new Date();
        logFile.write(date.toISOString() + '\t' + req.url + '\t' + (stopwatchEnd - stopwatchStart) + '\t' + req.headers['user-agent'] + '\n');
        logFile.end();
    });
}

const server = http.createServer(requestListener);
server.listen(8080);
