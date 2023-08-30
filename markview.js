const https = require('https');
require('dotenv').config();
const marktex = require('./marktex');

const repositories = {
    'notes-ipp': 'vitkolos/notes-ipp',
};

function getView(originalPath, pathOffset, res) {
    loadGithubData(originalPath, pathOffset, res, pagify);
}

function getSource(originalPath, pathOffset, res) {
    loadGithubData(originalPath, pathOffset, res, markdown => markdown);
}

function getCards(originalPath, pathOffset, res) {
    loadGithubData(originalPath, pathOffset, res, cardify);
}

function loadGithubData(originalPath, pathOffset, res, processor) {
    let path = originalPath.slice(pathOffset);

    if (path[0] in repositories) {
        if (path[1] == 'blob') {
            path.splice(1, 1);
            res.writeHead(302, {
                'Location': '/' + originalPath.slice(0, pathOffset).join('/') + '/' + path.join('/')
            });
            res.end();
        } else if (path.length == 1) {
            res.writeHead(302, {
                'Location': '/' + originalPath.join('/') + '/main/'
            });
            res.end();
        } else {
            https.get('https://raw.githubusercontent.com/' + repositories[path[0]] + '/' + path.slice(1).join('/'), res2 => {
                let data = [];

                if (res2.statusCode != 200) {
                    showDirectoryStructure(originalPath, pathOffset, res);
                    return;
                }

                res2.on('data', chunk => {
                    data.push(chunk);
                });

                res2.on('end', () => {
                    const suffix = path.at(-1).split('.').at(-1);

                    if (['png', 'jpg', 'jpeg'].includes(suffix)) {
                        if (suffix == 'jpg') {
                            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                        } else {
                            res.writeHead(200, { 'Content-Type': 'image/' + suffix });
                        }

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
                        res.end(processor(content, command, { path: originalPath, offset: pathOffset, repo: repositories[path[0]] }));
                    }
                });
            }).on('error', err => {
                notFound(res, err.message);
            });
        }
    } else {
        notFound(res);
    }
}

function pagify(markdown, command, path) {
    const options = { throwOnError: false };
    const titleMatch = markdown.match(/^# (.*)/);
    const title = (titleMatch && titleMatch.length == 2) ? titleMatch[1] : 'Markdown';
    const body = marktex.processKatex(markdown, options);
    return fillHtmlTemplate(body, title, path);
}

function cardify(markdown, command, path) {
    let title = '';
    let description = '';
    let currentHeading = '';
    let currentCard;
    const allCards = [];
    const categories = [];
    const indentationMatch = markdown.match(/\n([ \t]+)/);
    const indentation = (indentationMatch && indentationMatch.length == 2) ? indentationMatch[1] : '\t';
    const ulBullet = '[-*+] ';
    const ulRegExp = new RegExp('^' + ulBullet);

    markdown.split('\n').forEach(line => {
        if (line != '') {
            const ll = getListLevel(line, indentation, ulBullet);

            if (line.substring(0, 2) == '# ') {
                title = line.substring(2);
            } else if (line.substring(0, 3) == '## ') {
                currentHeading = line.substring(3);
                categories.push(currentHeading);
            } else if (ll == 0) {
                if (currentCard && currentCard.descriptionLines.length) {
                    allCards.push(currentCard);
                }

                currentCard = new Object();
                currentCard.title = line.substring(2);
                currentCard.category = currentHeading;
                currentCard.id = generateId(currentCard.title, allCards);
                currentCard.descriptionLines = [];
            } else if (currentCard == undefined) {
                description = line;
            } else if (ll == -1) {
                currentCard.descriptionLines.push(line);
            } else {
                currentCard.descriptionLines.push(line.substring(indentation.length));
            }
        }
    });

    if (command == 'cards-json') {
        return JSON.stringify({ title, description, categories, cards: allCards });
    } else if (command == 'anki' || command == 'quizlet') {
        const titleSep = (command == 'anki') ? '; ' : ';';
        const lineSep = (command == 'anki') ? '<br>' : '\n';
        const cardSep = (command == 'anki') ? '\n' : '\n\n';
        const separatorRemover = (command == 'anki') ? (text => text.replace(/;/g, ',')) : (text => text); // this fixes semicolons causing errors in anki

        return allCards.map(card => {
            if (card.descriptionLines.length == 1 && ulRegExp.test(card.descriptionLines[0])) {
                return separatorRemover(card.title) + titleSep + separatorRemover(card.descriptionLines[0].substring(2));
            } else {
                return separatorRemover(card.title) + titleSep + separatorRemover(card.descriptionLines.join(lineSep));
            }
        }).join(cardSep);
    } else {
        const options = { throwOnError: false };
        const staticRoute = '/' + path.path.slice(0, path.offset - 1).join('/') + '/static';
        let body = `
            <h1>${title}</h1>
            <div class="htbutton">
                <span>${title}</span><button type="button" onclick="hideTop(false);">zobrazit záhlaví</button>
            </div>
            <div class="top">
                <div class="learn">
                    <button type="button" onclick="startRun(-1);">nové</button>
                    <button type="button" onclick="startRun(1);">≤ 1</button>
                    <button type="button" onclick="startRun(2);">≤ 2</button>
                    <button type="button" onclick="startRun(3);">≤ 3</button>
                    <button type="button" onclick="startRun(4);">všechny karty</button>
                </div>
                <div class="options">
                    <button type="button" onclick="resetPrompt();">reset</button>
                    <button type="button" onclick="exportData();">export</button>
                    <button type="button" onclick="importData();">import</button>
                    <button type="button" onclick="hideTop(true);">skrýt záhlaví</button>
                </div>
            </div>
            <code id="exporthere"></code>
            <div id="stats" class="stats"></div>
        `;

        allCards.forEach(card => {
            const desc = (card.descriptionLines.length == 1 && ulRegExp.test(card.descriptionLines[0]))
                ? card.descriptionLines[0].substring(2) : card.descriptionLines.join('\n');
            body += `
                <div id="${card.id}" class="card">
                    <div class="title" onclick="flip();">
                        <div class="category">${card.category}</div>
                        ${marktex.processKatex(card.title, options)}
                    </div>
                    <div class="description">${marktex.processKatex(desc, options)}</div>
                </div>
            `;
        });

        body += `
            <div id="welldone" class="welldone">Hurá, máš hotovo! 🎉</div>
            <div class="flipper" onclick="flip();"></div>
            <div id="controls" class="controls">
                <div class="ctop">
                    <button type="button" class="flip" onclick="flip();">rozbalit</button>
                    <button type="button" class="previous" onclick="previous();">předchozí</button>
                    <button type="button" class="next" onclick="next();">další</button>
                    <button id="progress" class="progress" tabindex="-1"></buttons>
                </div>
                <div class="cbottom">
                    <button type="button" class="mark" onclick="mark(1);">1 neumím</button>
                    <button type="button" class="mark" onclick="mark(2);">2 umím trochu</button>
                    <button type="button" class="mark" onclick="mark(3);">3 umím středně</button>
                    <button type="button" class="mark" onclick="mark(4);">4 umím výborně</button>
                </div>
            </div>
            <script>var cardIds = ['${allCards.map(card => card.id).join('\', \'')}'];</script>
            <script src="${staticRoute}/cards.js"></script>
        `;
        const head = `<link rel="stylesheet" href="${staticRoute}/cards.css">`;
        return fillHtmlTemplate(body, title + ': kartičky', path, head);
    }
}

function getListLevel(line, indentation, ulBullet) {
    const gllMatch = line.match(new RegExp('^((' + indentation + ')*)' + ulBullet));

    if (gllMatch == null || indentation == '') {
        return -1;
    } else {
        return gllMatch[1].length / indentation.length;
    }
}

function slugify(string) {
    string = replaceAll(string.toLowerCase(), 'říšžťčýůňúěďáéóě', 'risztcyunuedaeoe');
    return string.replace(/\W/g, ' ').trim().replace(/\s+/g, '-');
}

function generateId(string, cards) {
    const slug = slugify(string);
    let id = slug.substring(0, 20) + '~' + slug.slice(-9);

    while (cards.some(card => card.id == id)) {
        id += '*';
    }

    return id;
}

function replaceAll(str, arr1, arr2) {
    var re = new RegExp(arr1.split('').join('|'), 'gi');

    return str.replace(re, function (matched) {
        return arr2[arr1.indexOf(matched)];
    });
}

function fillHtmlTemplate(body, title, path, head = '') {
    const links = ['view', 'cards', 'source'].map(link => {
        const currentClass = link == path.path[path.offset - 1] ? ' class="current"' : '';
        return '<a href="/' + path.path.slice(0, path.offset - 1).join('/') + '/' + link + '/' + path.path.slice(path.offset).join('/') + '"' + currentClass + '>' + link + '</a>';
    });
    const ghUrl = 'https://github.com/' + path.repo + '/blob/' + path.path.slice(path.offset + 1).join('/');

    const matomo = `<!-- Matomo -->
    <script>
        var _paq = window._paq = window._paq || [];
        _paq.push(['disableCookies']);
        _paq.push(['trackPageView']);
        _paq.push(['enableLinkTracking']);
        (function() {
            var u = "//www.vitkolos.cz/matomo/";
            _paq.push(['setTrackerUrl', u + 'matomo.php']);
            _paq.push(['setSiteId', '1']);
            var d = document,
                g = d.createElement('script'),
                s = d.getElementsByTagName('script')[0];
            g.async = true;
            g.src = u + 'matomo.js';
            s.parentNode.insertBefore(g, s);
        })();
    </script>
    <!-- End Matomo Code -->`;

    return `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css" integrity="sha384-vKruj+a13U8yHIkAyGgK1J3ArTLzrFGBbBc0tDp4ad/EyewESeXE/Iv67Aj8gKZ0" crossorigin="anonymous">
    <style>
    body {
        font-family: sans-serif;
        font-size: 1.1em;
        line-height: 1.5;
        max-width: 700px;
        margin: 5rem auto;
        padding: 0 1rem;
    }
    code {
        font-size: 1.25em;
    }
    li {
        margin: 0.5rem 0;
    }
    table {
        border-collapse: collapse;
    }
    td {
        border: 1px solid #ccc;
        padding: 0.25rem 0.5rem;
    }
    ul.index li a {
        display: block;
    }
    a:hover {
        text-decoration: none;
    }
    .dir, .current {
        font-weight: bold;
    }
    .dark {
        color: #ccc;
        background-color: black;
    }
    .dark a {
        color: lightyellow;
    }
    </style>
    ${matomo}
    ${head}
</head>
<body>
<small style="position:absolute;top:0.25rem;left:0.5rem"><a href=".">this dir</a> | ${links.join(' | ')} | <a href="${ghUrl}">edit</a> | <a href="javascript:(function(){document.body.classList.toggle('dark');})();">dark</a></small>
${body}
</body>
</html>
`;
}

function showDirectoryStructure(originalPath, pathOffset, res) {
    const repositorySlug = originalPath[pathOffset];
    const branch = originalPath[pathOffset + 1];
    const pathInRepo = originalPath.slice(pathOffset + 2).join('/');
    const apiUrl = 'https://vitkolos:' + process.env.GH_TOKEN + '@api.github.com/repos/' + repositories[repositorySlug] + '/contents/' + pathInRepo + '?ref=' + branch;

    https.get(apiUrl, { headers: { 'User-Agent': 'vitkolos' } }, res2 => {
        let data = [];

        if (res2.statusCode != 200) {
            notFound(res, 'not found :(');
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
            res.end(fillHtmlTemplate(body, title, { path: originalPath, offset: pathOffset, repo: repositories[repositorySlug] }));
        });
    }).on('error', err => {
        notFound(res, err.message);
    });
}

function notFound(res, err = 'page not found') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(err);
}

module.exports = {
    getView, getCards, getSource
};
