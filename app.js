// in order to add npm package: docker exec -it node /bin/sh
// debugging: docker logs node

const http = require('http');
const url = require('url');
const path = require('path');
const pp = path.posix;
const fs = require('fs');
const view = require('./src/view');
const static = require('./src/static');
const page = require('./src/page');
const stringext = require('./src/stringext');

const requestListener = function (req, res) {
    const stopwatchStart = performance.now();
    const logFile = fs.createWriteStream(__dirname + '/access.log', { flags: 'a' });
    
    const prefix = process.env.PATH_PREFIX || '/';
    const parsedUrl = url.parse(req.url);
    const pathNoPrefix = stringext.removePrefix(parsedUrl.pathname, prefix + pp.sep);
    const [mode, localPath] = stringext.breakAt(pathNoPrefix, pp.sep);
    const request = {
        req,
        url: parsedUrl,
        prefix,
        mode,
        localPath
    };

    switch (mode) {
        case 'view':
        case 'source':
            view.getView(request, res, mode);
            break;

        case 'cards':
        case 'anki':
        case 'quizlet':
        case 'cards-json':
            view.getView(request, res, 'cards');
            break;

        case 'static':
            static.getFile(request, res);
            break;

        default:
            page.notFound(res, 'Mode not found');
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
