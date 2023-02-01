const fs = require('fs');

function getFile(urlParts, pathOffset, res) {
    if (urlParts[pathOffset] == 'cards.js' || urlParts[pathOffset] == 'cards.css') {
        fs.readFile('./static/' + urlParts.slice(pathOffset).join('/'), (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404: File not found');
            } else {
                if (urlParts[pathOffset] == 'cards.js') {
                    res.writeHead(200, { 'Content-Type': 'application/javascript' });
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/css' });
                }
                res.end(data);
            }
        });
    }
}

module.exports = {
    getFile
};
