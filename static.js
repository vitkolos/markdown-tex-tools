const fs = require('fs');

function getFile(urlParts, pathOffset, res) {
    const extension = urlParts[pathOffset].split('.').pop();

    const supportedExtensions = {
        js: 'application/javascript',
        css: 'text/css',
    };

    if (extension in supportedExtensions) {
        fs.readFile('./static/' + urlParts.slice(pathOffset).join('/'), (err, data) => {
            if (err) {
                fileNotFound(res);
            } else {
                res.writeHead(200, { 'Content-Type': supportedExtensions[extension] });
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
