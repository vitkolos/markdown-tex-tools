const path = require('path');
const pp = path.posix;
require('dotenv').config();
const page = require('./page');
const processors = require('./processors');
const stringext = require('./stringext');
const downloader = require('./downloader');
const repositories = require('../repositories.json');

const rawContentTypes = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    txt: 'text/plain; charset=utf-8',
    csv: 'text/plain; charset=utf-8',
    tsv: 'text/plain; charset=utf-8',
    json: 'application/json; charset=utf-8',
    html: 'text/html; charset=utf-8',
};

function getView(request, res, processorType, rawMode = false) {
    const defaultBranch = 'main';
    var repoSlug, filePath, branch = '';
    [repoSlug, filePath] = stringext.breakAt(request.localPath, pp.sep);
    request.repoSlug = repoSlug;
    request.filePath = filePath;
    request.branch = '';

    if (repoSlug in repositories) {
        const repository = repositories[repoSlug];
        const isGithub = 'github' in repository;

        if (isGithub) {
            [branch, filePath] = stringext.breakAt(filePath, pp.sep);
            request.branch = branch;
            request.filePath = filePath;
            request.filePathNoSlash = stringext.removeSuffix(request.filePath, '/');
        }

        request.isGithub = isGithub;
        request.repository = repository;
        request.filePathList = request.filePath.split(pp.sep);

        if (isGithub && branch == 'blob') {
            page.redirect(res, pp.join(request.prefix, request.mode, repoSlug, filePath));
        } else if (isGithub && branch == '') {
            page.redirect(res, pp.join(request.prefix, request.mode, repoSlug, defaultBranch, pp.sep));
        } else if (!isGithub && filePath == '') {
            page.redirect(res, repository.url);
        } else {
            var url, options;

            if (isGithub) {
                url = 'https://api.github.com/repos/' + request.repository.github + '/contents/' + request.filePathNoSlash + '?ref=' + request.branch;
                options = {
                    headers: {
                        'User-Agent': process.env.USERAGENT,
                        'Accept': rawMode ? 'application/vnd.github.raw+json' : 'application/vnd.github.object+json',
                        'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
                        'X-GitHub-Api-Version': '2022-11-28',
                    }
                };
            } else {
                url = repository.url + filePath;
                options = {
                    headers: {
                        'User-Agent': process.env.USERAGENT,
                    }
                };
            }

            downloader.getContent(url, options, success, failure);

            function success(content) {
                var isFile = true;
                var directoryItems = [];

                // process content & redirect if neccessary
                if (isGithub && !rawMode) {
                    const jsonData = JSON.parse(content.toString());

                    if (jsonData.type == 'dir' && 'entries' in jsonData) {
                        isFile = false;
                        directoryItems = jsonData.entries;
                    } else if (jsonData.type == 'file' && 'content' in jsonData && jsonData.encoding == 'base64') {
                        content = Buffer.from(jsonData.content, 'base64');
                    } else if (jsonData.type == 'file' && jsonData.content == '' && jsonData.encoding == 'none') {
                        // file is larger than 1 MB (and smaller than 100 MB)
                        // see https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
                        getView(request, res, processorType, true);
                        return;
                    } else {
                        page.notFound(res, 'Something went wrong');
                        return;
                    }

                    if (isFile && filePath.endsWith(pp.sep)) {
                        page.redirect(res, pp.join(request.prefix, request.mode, request.repoSlug, request.branch, request.filePathNoSlash));
                        return;
                    } else if (!isFile && !request.localPath.endsWith(pp.sep)) {
                        page.redirect(res, pp.join(request.prefix, request.mode, request.repoSlug, request.branch, request.filePath, pp.sep));
                        return;
                    }
                }

                // return content
                const extension = stringext.removePrefix(pp.extname(filePath), '.');

                if (!isFile) {
                    res.writeHead(200, { 'Content-Type': rawContentTypes.html });
                    res.end(showDirectoryStructure(directoryItems, request));
                } else if (extension in rawContentTypes) {
                    res.writeHead(200, { 'Content-Type': rawContentTypes[extension] });
                    res.end(content);
                } else {
                    if (request.mode == 'cards-json') {
                        res.writeHead(200, { 'Content-Type': rawContentTypes.json });
                    } else if (['anki', 'quizlet', 'source'].includes(request.mode)) {
                        res.writeHead(200, { 'Content-Type': rawContentTypes.txt });
                    } else {
                        res.writeHead(200, { 'Content-Type': rawContentTypes.html });
                    }

                    const processor = processors.list[processorType];
                    res.end(processor(content.toString(), request));
                }
            }

            function failure(type, data) {
                if (type == 'statusCode') {
                    page.notFound(res, 'Page not found');
                } else if (type == 'error') {
                    page.notFound(res, data.message);
                }
            }
        }
    } else {
        page.notFound(res, 'Repository not found');
    }
}

function showDirectoryStructure(items, request) {
    const reversePath = [...request.filePathList];
    reversePath.reverse();
    reversePath.push(request.repoSlug);
    reversePath.shift();
    const title = decodeURIComponent(reversePath.join(' | '));
    const doubleDotAddress = request.filePath.length > 0 ? '..' : '/';
    var body = '<ul class="index">';
    body += `<li><a href="${doubleDotAddress}" class="dir">..</a></li>`;

    items.forEach(item => {
        if (!item.name.startsWith('.')) {
            const trailingSlash = item.type == 'dir' ? '/' : '';
            const currentPath = pp.join(request.prefix, request.mode, request.repoSlug, request.branch, item.path, trailingSlash);
            body += `<li><a href="${currentPath}" class="${item.type}">${item.name}</a></li>`;
        }
    });

    body += '</ul>';
    return processors.fillHtmlTemplate(body, title, request);
}

module.exports = { getView };
