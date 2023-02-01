const https = require('https');
const marktex = require('./marktex')

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
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                        } else if (command == 'anki' || command == 'quizlet') {
                            res.writeHead(200, { 'Content-Type': 'text/plain' });
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
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
</head>
<body>
${marktex.process(markdown, options)}
</body>
</html>
`;
}

function cardify(markdown, command) {
    let title = '';
    let description = '';
    let currentHeading = '';
    let currentCard;
    let allCards = [];
    const indentationMatch = markdown.match(/\n([ \t]+)/);
    const indentation = (indentationMatch && indentationMatch.length == 2) ? indentationMatch[1] : '\t';

    const lines = markdown.split('\n').forEach(line => {
        if (line != '') {
            const ll = getListLevel(line, indentation);

            if (line.substring(0, 2) == '# ') {
                title = line.substring(2);
            } else if (line.substring(0, 3) == '## ') {
                currentHeading = line.substring(3);
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
        return JSON.stringify(allCards);
    } else if (command == 'anki') {

    } else if (command == 'quizlet') {

    } else {

    }
}

function getListLevel(line, indentation) {
    const gllMatch = line.match(new RegExp('^((' + indentation + ')*)[-*+] '));

    if (gllMatch == null || indentation == '') {
        return -1;
    } else {
        return gllMatch[1].length / indentation.length;
    }
}

function generateId(string, cards) {
    string = replaceAll(string.toLowerCase(), 'říšžťčýůňúěďáéóě', 'risztcyunuedaeoe');
    const slug = string.replace(/\W/g, ' ').trim().replace(/\s+/g, '-');
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

function notFound(res, err = 'page not found') {
    res.writeHead(404);
    res.end(err);
}

module.exports = {
    getView, getCards
}