// in order to add npm package: docker exec -it node /bin/sh
// debugging: docker logs node

const http = require('http');
const markview = require('./markview');
const static = require('./static');

const requestListener = function (req, res) {
    // where the real path starts; e.g. /node/ = 1, /script/node/app/ = 3
    const pathOffset = 1;
    const urlParts = req.url.replace(/^\/|\/$/g, '').split('/');

    switch (urlParts[pathOffset]) {
        case 'view':
            markview.getView(urlParts, pathOffset + 1, res);
            break;

        case 'source':
            markview.getSource(urlParts, pathOffset + 1, res);
            break;

        case 'cards':
        case 'anki':
        case 'quizlet':
        case 'cards-json':
            markview.getCards(urlParts, pathOffset + 1, res);
            break;

        case 'static':
            static.getFile(urlParts, pathOffset + 1, res);
            break;

        default:
            res.writeHead(404);
            res.end('page not found');
            break;
    }
}

const server = http.createServer(requestListener);
server.listen(8080);
