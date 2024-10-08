const path = require('path');
const pp = path.posix;
const marked = require('marked');
const marktex = require('./marktex');
const stringext = require('./stringext');
const { getHeadingList } = require('marked-gfm-heading-id');

const list = {
    view: pagify,
    source: markdown => markdown,
    cards: cardify
};

function pagify(markdown, request) {
    const title = getTitle(markdown, request);
    const decoratedTitle = decorateTitle(title, request);

    const renderer = new marked.Renderer();
    const markedInstance = marktex.setupMarkedInstance(marktex.options, renderer);
    const body = marktex.processKatex(markedInstance, markdown);

    return fillHtmlTemplate(placeToc(body, getHeadingList()), decoratedTitle, request);
}

function cardify(markdown, request) {
    const title = getTitle(markdown, request);
    let description = '';
    let descriptionOpen = true;
    let currentHeading = '';
    let currentCard = null;
    const allCards = [];
    const categories = [[], []];
    const indentationMatch = markdown.match(/\n([ \t]+)/);
    const indentation = (indentationMatch && indentationMatch.length == 2) ? indentationMatch[1] : '\t';
    const listBullet = '([-*+]|[0-9]+\.) ';
    const ulRegExp = new RegExp('^[-*+] ');
    const titleCategoryRegExp = new RegExp("^\\S+: ");

    const finishCard = (currentCard, allCards) => {
        if (currentCard && currentCard.descriptionLines.length) {
            allCards.push(currentCard);
        }
    };

    markdown.split('\n').forEach(line => {
        if (line != '') {
            const ll = getListLevel(line, indentation, listBullet);

            if (line.substring(0, 3) == '## ') {
                finishCard(currentCard, allCards);
                currentCard = null;
                descriptionOpen = false;

                currentHeading = line.substring(3);
                categories[0].push(currentHeading);
            } else if (line[0] == '#') {
                // ignore line with heading
            } else if (ll == 0) {
                finishCard(currentCard, allCards);
                descriptionOpen = false;

                currentCard = new Object();
                currentCard.title = line.substring(2);
                currentCard.categories = [null, null];
                currentCard.id = generateId(currentCard.title, allCards);
                currentCard.descriptionLines = [];

                if (currentHeading) {
                    currentCard.categories[0] = currentHeading;
                }

                if (titleCategoryRegExp.test(currentCard.title)) {
                    const catFromTitle = currentCard.title.split(':', 2)[0];
                    currentCard.categories[1] = catFromTitle;

                    if (!categories[1].includes(catFromTitle)) {
                        categories[1].push(catFromTitle);
                    }
                }
            } else if (currentCard == null) {
                if (descriptionOpen && description == '' && line != '') {
                    description = line;
                }
            } else if (ll == -1) {
                currentCard.descriptionLines.push(line);
            } else {
                currentCard.descriptionLines.push(line.substring(indentation.length));
            }
        }
    });

    finishCard(currentCard, allCards);

    if (request.mode == 'cards-json') {
        return JSON.stringify({ title, description, categories, cards: allCards });
    } else if (request.mode == 'anki' || request.mode == 'quizlet') {
        const isAnki = request.mode == 'anki';
        const titleSep = isAnki ? '; ' : ';';
        const lineSep = isAnki ? '<br>' : '\n';
        const cardSep = isAnki ? '\n' : '\n\n';
        const separatorRemover = isAnki ? (text => text.replace(/;/g, ',')) : (text => text); // this fixes semicolons causing errors in anki

        return allCards.map(card => {
            if (card.descriptionLines.length == 1 && ulRegExp.test(card.descriptionLines[0])) {
                return separatorRemover(card.title) + titleSep + separatorRemover(card.descriptionLines[0].substring(2));
            } else {
                return separatorRemover(card.title) + titleSep + separatorRemover(card.descriptionLines.join(lineSep));
            }
        }).join(cardSep);
    } else {
        const staticRoute = pp.join(request.prefix, 'static');
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
                    <button type="button" onclick="startRun(4);">všechny</button>
                    <span class="filtersactive-wrapper" ${(categories[0].length || categories[1].length) ? '' : 'style="display:none"'}>
                        <input type="checkbox" id="filtersactive" onclick="toggleFilters();" /><label for="filtersactive">filtrovat</label>
                    </span>
                </div>
                <div class="filters" id="filters">
                    ${categories.map((group, gIndex) => `<div>${group.map((category, cIndex) =>
            `<span><input type="checkbox" id="filter-${gIndex}-${cIndex}" onclick="toggleFilter(${gIndex}, '${category}', this);" data-title="${category}" />
                        <label for="filter-${gIndex}-${cIndex}">${category}</label></span>`
        ).join('')}</div>`).join('')}
                </div>
                <div class="options">
                    <button type="button" onclick="resetPrompt();">reset</button>
                    <button type="button" onclick="exportData();" id="exportbtn">export</button>
                    <button type="button" onclick="importData();">import</button>
                    <button type="button" onclick="hideTop(true);">skrýt záhlaví</button>
                </div>
            </div>
            <code id="exporthere"></code>
            <div id="stats" class="stats"></div>
        `;

        const markedInstance = marktex.setupMarkedInstance(marktex.options);
        allCards.forEach(card => {
            const desc = (card.descriptionLines.length == 1 && ulRegExp.test(card.descriptionLines[0]))
                ? card.descriptionLines[0].substring(2) : card.descriptionLines.join('\n');
            body += `
                <div id="${card.id}" class="card">
                    <div class="title" onclick="flip();">
                        <div class="categories">${card.categories[0] ? card.categories[0] : ''}</div>
                        ${marktex.processKatex(markedInstance, card.title)}
                    </div>
                    <div class="description">${marktex.processKatex(markedInstance, desc)}</div>
                </div>
            `;
        });

        body += `
            <div id="welldone" class="welldone">Hurá, máš hotovo! 🎉 <br>${'beer' in request.repository ? request.repository.beer : ''}</div>
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
            <script>
                var cardIds = ['${allCards.map(card => card.id).join('\', \'')}'];
                var cardCategories = {${allCards.map(card => `'${card.id}': ['${card.categories.join('\', \'')}'], `).join('')}};
            </script>
            <script src="${staticRoute}/cards.js"></script>
        `;
        const head = `<link rel="stylesheet" href="${staticRoute}/cards.css">`;
        const decoratedTitle = decorateTitle(title, request, true);
        return fillHtmlTemplate(body, decoratedTitle, request, head);
    }
}

function getTitle(markdown, request) {
    const titleMatch = markdown.match(/^# (.*)/);
    const fallbackTitle = stringext.removeSuffix(request.filePathList.at(-1), '.md');
    return (titleMatch && titleMatch.length == 2) ? titleMatch[1].replaceAll('\\', '') : fallbackTitle;
}

function decorateTitle(title, request, cards = false) {
    if (cards) {
        title += ': kartičky';
    }

    if (request.filePathList.length >= 2) {
        return title + ' | ' + request.filePathList.at(-2);
    } else {
        return title;
    }
}

function getListLevel(line, indentation, listBullet) {
    const gllMatch = line.match(new RegExp('^((' + indentation + ')*)' + listBullet));

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

function placeToc(pageHtml, toc) {
    toc.shift(); // remove first h1

    if (toc.length < 3) {
        return pageHtml;
    }

    const tocHtml = `<div class="toc">${toc.map(h => `<a href="#${h.id}" class="toc-h${h.level}">${h.text}</a>`).join('')}</div>`;
    return pageHtml.replace('</h1>', '</h1>' + tocHtml);
}

function fillHtmlTemplate(body, title, request, head = '') {
    const links = ['view', 'cards', 'source'].map(link => {
        const currentClass = link == request.mode ? 'class="current"' : '';
        return `<a href="${pp.join(request.prefix, link, request.localPath)}" ${currentClass}>${link}</a>`;
    });
    const ghLink = request.isGithub ? '<a href="https://github.com/' + pp.join(request.repository.github, 'blob', request.branch, request.filePath) + '">edit</a> | ' : '';
    const staticRoute = pp.join(request.prefix, 'static');

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
    <link rel="stylesheet" href="${staticRoute}/style.css">
    <script src="${staticRoute}/theme.js"></script>
    ${matomo}
    ${head}
</head>
<body>
<small class="top-nav"><a href=".">this dir</a> | ${links.join(' | ')} | ${ghLink}<a href="#" id="theme-toggle">dark</a></small>
<small class="bottom-nav"><a href="#">top</a></small>
${body}
</body>
</html>
`;
}

module.exports = { list, fillHtmlTemplate };
