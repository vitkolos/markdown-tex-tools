const fs = require('fs');
const path = require('path');
const { notFound } = require('./notfound');
const { redirect } = require('./redirect');

function getFile(request, res) {
    const extension = path.extname(request.localPath).replace(/^\./, '');
    const supportedExtensions = {
        js: 'application/javascript',
        css: 'text/css',
        txt: 'text/plain'
    };

    if (request.url.pathname.endsWith('/')) {
        redirect(res, request.url.pathname.slice(0, -1));
    } else if (extension in supportedExtensions) {
        fs.readFile('./static/' + request.localPath, (err, data) => {
            if (err) {
                fileNotFound(res);
            } else {
                res.writeHead(200, { 'Content-Type': supportedExtensions[extension] });
                res.end(data);
            }
        });
    } else if (request.localPath == '1.gif') {
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
    notFound(res, 'File not found');
}

module.exports = {
    getFile
};
