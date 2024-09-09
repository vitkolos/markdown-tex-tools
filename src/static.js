const fs = require('fs');
const path = require('path');
const pp = path.posix;
const page = require('./page');
const stringext = require('./stringext');

function getFile(request, res) {
    const extension = stringext.removePrefix(pp.extname(request.localPath), '.');
    const supportedExtensions = {
        js: 'application/javascript',
        css: 'text/css',
        txt: 'text/plain'
    };

    if (request.url.pathname.endsWith(pp.sep)) {
        page.redirect(res, request.url.pathname.slice(0, -1));
    } else if (extension in supportedExtensions) {
        fs.readFile(path.join('static', request.localPath), (err, data) => {
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
    page.notFound(res, 'File not found');
}

module.exports = { getFile };
