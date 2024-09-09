const https = require('https');
require('dotenv').config();
const { notFound } = require('./notfound');
const processors = require('./processors');

const repositories = {
    'notes-ipp': 'vitkolos/notes-ipp',
    'grsc': {
        'url': 'https://mff.share.grsc.cz',
        'beer': 'Dej si pauzu od učení a podepiš <a href="https://portal.gov.cz/e-petice/713-cisla-linky-na-leve-strane-vozidel-pid">tuhle cool petici</a>.',
    }
};

const rawContentTypes = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    txt: 'text/plain; charset=utf-8',
    csv: 'text/plain; charset=utf-8',
    tsv: 'text/plain; charset=utf-8',
    json: 'application/json; charset=utf-8',
};

function getView(request, pathOffset, res, processorType) {
    const originalPath = request.urlParts;
    const defaultBranch = 'main';
    let path = originalPath.slice(pathOffset);

    if (path[0] in repositories) {
        const repository = repositories[path[0]];
        const isGithub = typeof (repository) == 'string';

        if (path[1] == 'blob') {
            path.splice(1, 1);
            res.writeHead(302, {
                'Location': '/' + originalPath.slice(0, pathOffset).join('/') + '/' + path.join('/')
            });
            res.end();
        } else if (path.length == 1) {
            res.writeHead(302, {
                'Location': isGithub
                    ? ('/' + [...originalPath, defaultBranch].join('/') + '/')
                    : repository['url']
            });
            res.end();
        } else {
            let url;

            if (isGithub) {
                url = 'https://raw.githubusercontent.com/' + repository + '/' + path.slice(1).join('/');
            } else {
                url = repository['url'] + '/' + path.slice(1).join('/');
            }

            https.get(url, res2 => {
                let data = [];

                if (res2.statusCode != 200) {
                    if (isGithub) {
                        showDirectoryStructure(originalPath, pathOffset, res);
                    } else {
                        notFound(res, 'Page not found');
                    }
                    return;
                }

                res2.on('data', chunk => {
                    data.push(chunk);
                });

                res2.on('end', () => {
                    const suffix = path.at(-1).split('.').at(-1);

                    if (suffix in rawContentTypes) {
                        res.writeHead(200, { 'Content-Type': rawContentTypes[suffix] });
                        const content = Buffer.concat(data);
                        res.end(content);
                    } else {
                        const command = originalPath[pathOffset - 1];

                        if (command == 'cards-json') {
                            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        } else if (command == 'anki' || command == 'quizlet' || command == 'source') {
                            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        }

                        const content = Buffer.concat(data).toString();
                        const processor = processors.list[processorType];
                        res.end(processor(content, command, { path: originalPath, offset: pathOffset, repo: repository }));
                    }
                });
            }).on('error', err => {
                notFound(res, err.message);
            });
        }
    } else {
        notFound(res, 'Repository not found');
    }
}

function showDirectoryStructure(originalPath, pathOffset, res) {
    const repositorySlug = originalPath[pathOffset];
    const branch = originalPath[pathOffset + 1];
    const pathInRepo = originalPath.slice(pathOffset + 2).join('/');
    const apiUrl = 'https://vitkolos:' + process.env.GH_TOKEN + '@api.github.com/repos/' + repositories[repositorySlug] + '/contents/' + pathInRepo + '?ref=' + branch;

    https.get(apiUrl, { headers: { 'User-Agent': 'vitkolos' } }, res2 => {
        let data = [];

        if (res2.statusCode != 200) {
            notFound(res, 'Page does not exist');
            return;
        }

        res2.on('data', chunk => {
            data.push(chunk);
        });

        res2.on('end', () => {
            const content = Buffer.concat(data).toString();
            const items = JSON.parse(content);
            let reversePath = originalPath.slice(pathOffset + 2);
            reversePath.reverse();
            reversePath.push(repositorySlug);
            const title = decodeURIComponent(reversePath.join(' | '));
            const doubleDotAddress = pathInRepo.length ? ('/' + originalPath.slice(0, -1).join('/') + '/') : '/';
            let body = '<ul class="index">';
            body += `<li><a href="${doubleDotAddress}" class="dir">..</a></li>`;

            items.forEach(item => {
                if (!item.name.startsWith('.')) {
                    let currentPath = '/' + originalPath.slice(0, pathOffset + 2).join('/') + '/' + item.path + (item.type == 'dir' ? '/' : '');
                    body += `<li><a href="${currentPath}" class="${item.type}">${item.name}</a></li>`;
                }
            });

            body += '</ul>';
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(processors.fillHtmlTemplate(body, title, { path: originalPath, offset: pathOffset, repo: repositories[repositorySlug] }));
        });
    }).on('error', err => {
        notFound(res, err.message);
    });
}

module.exports = {
    getView
};
