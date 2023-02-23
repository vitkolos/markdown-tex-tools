const https = require('https');
const marktex = require('./marktex');

function getView(originalPath, pathOffset, res) {
    loadGithubData(originalPath, pathOffset, res, pagify);
}

function getCards(originalPath, pathOffset, res) {
    loadGithubData(originalPath, pathOffset, res, cardify);
}

function loadGithubData(originalPath, pathOffset, res, processor) {
    let path = originalPath.slice(pathOffset);

    if (path[0] == 'notes-ipp') {
        if (path[1] == 'blob') {
            path.splice(1, 1);
            res.writeHead(302, {
                'Location': '/' + originalPath.slice(0, pathOffset).join('/') + '/' + path.join('/')
            });
            res.end();
        } else {
            https.get('https://raw.githubusercontent.com/vitkolos/' + path.join('/'), res2 => {
                let data = [];

                if (res2.statusCode != 200) {
                    notFound(res, 'not found :(');
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
                        } else if (command == 'anki' || command == 'quizlet') {
                            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        }

                        const content = Buffer.concat(data).toString();
                        res.end(processor(content, command));
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

function pagify(markdown, command) {
    const options = { throwOnError: false };
    const titleMatch = markdown.match(/^# (.*)/);
    const title = (titleMatch && titleMatch.length == 2) ? titleMatch[1] : 'Markdown';
    const body = marktex.process(markdown, options);
    return fillHtmlTemplate(body, title);
}

function cardify(markdown, command) {
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

        return allCards.map(card => {
            if (card.descriptionLines.length == 1 && ulRegExp.test(card.descriptionLines[0])) {
                return card.title + titleSep + card.descriptionLines[0].substring(2);
            } else {
                return card.title + titleSep + card.descriptionLines.join(lineSep);
            }
        }).join(cardSep);
    } else {
        const options = { throwOnError: false };
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
                        ${marktex.process(card.title, options)}
                    </div>
                    <div class="description">${marktex.process(desc, options)}</div>
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
            <script src="/node/static/cards.js"></script>
        `;
        const head = '<link rel="stylesheet" href="/node/static/cards.css">';
        return fillHtmlTemplate(body, title + ': kartičky', head);
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

function fillHtmlTemplate(body, title, head = '') {
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
    </style>
    ${head}
</head>
<body>
${body}
</body>
</html>
`;
}

function notFound(res, err = 'page not found') {
    res.writeHead(404);
    res.end(err);
}

module.exports = {
    getView, getCards
};
