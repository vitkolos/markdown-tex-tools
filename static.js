const fs = require('fs');

function getFile(urlParts, pathOffset, res) {
    if (urlParts[pathOffset] == 'cards.js' || urlParts[pathOffset] == 'cards.css') {
        fs.readFile('./static/' + urlParts.slice(pathOffset).join('/'), (err, data) => {
            if (err) {
                fileNotFound(res);
            } else {
                if (urlParts[pathOffset] == 'cards.js') {
                    res.writeHead(200, { 'Content-Type': 'application/javascript' });
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/css' });
                }
                res.end(data);
            }
        });
    } else if (urlParts[pathOffset] == '1.gif') {
        const data = Buffer.from('R0lGODlhAQABAID/AP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': data.length
        });
        res.end(data);
    } else {
        fileNotFound(res);
    }
}

function fileNotFound(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404: File not found');
}

module.exports = {
    getFile
};
