// currentCard = id of current card
// cardsToVisit = cards which will be visited in this run because they suit the constraints (list of ids)
// → variables above are not stored in localStorage, those below are stored in there
// currentRun = number setting the constraint (level)
// lastCards = list of cards visited in this run (list of ids)
// lcPointer = current position in lastCards array (index of currentCard)
// visitedCards = levels of visited cards (object … id: level)

var currentCard, cardsToVisit, currentRun, lastCards, lcPointer, visitedCards;
const lsPrefix = 'cards_' + slugify(decodeURIComponent(location.pathname)) + '_';

if (typeof cardIds !== 'undefined') {
    initialize();
}

function flip() {
    if (currentCard) {
        document.getElementById(currentCard).classList.toggle('flip');
    }
}

function initialize() {
    // load data from local storage
    const tempCR = localStorage.getItem(lsPrefix + 'currentRun');
    currentRun = (tempCR !== null && tempCR !== 'undefined') ? +tempCR : undefined;
    const tempP = localStorage.getItem(lsPrefix + 'lcPointer');
    lcPointer = tempP !== null ? +tempP : -1;
    const tempLC = localStorage.getItem(lsPrefix + 'lastCards');
    lastCards = tempLC ? JSON.parse(tempLC) : [];
    const tempVC = localStorage.getItem(lsPrefix + 'visitedCards');
    visitedCards = tempVC ? JSON.parse(tempVC) : {};

    someCalls();

    document.addEventListener('keydown', event => {
        if (currentCard) {
            switch (event.code) {
                case 'Space':
                    if (event.target.type != 'button') {
                        flip();
                    }

                    if (event.target == document.body) {
                        event.preventDefault();
                        return false;
                    }
                    break;

                case 'ArrowRight': next(); break;
                case 'ArrowLeft': previous(); break;
                case 'Digit1': mark(1); break;
                case 'Digit2': mark(2); break;
                case 'Digit3': mark(3); break;
                case 'Digit4': mark(4); break;
            }
        } else if (currentRun !== undefined && event.code == 'ArrowLeft') {
            previous();
        }
    });
}

function someCalls() {
    if (currentRun !== undefined) {
        localStorage.setItem(lsPrefix + 'lastRun', JSON.stringify(new Date()));
        currentCard = lastCards[lcPointer];
    }

    generateCardsToVisit();
    showCurrentCard();
    updateStats();
    showOrHideControls();
    cleanOldLS();
}

function saveCurrentState() {
    localStorage.setItem(lsPrefix + 'currentRun', currentRun);
    localStorage.setItem(lsPrefix + 'lcPointer', lcPointer);
    localStorage.setItem(lsPrefix + 'lastCards', JSON.stringify(lastCards));
    localStorage.setItem(lsPrefix + 'visitedCards', JSON.stringify(visitedCards));
}

function cleanOldLS() {
    // removes localStorage items older than one year (according to the year in the date)
    for (const key in localStorage) {
        if (key.startsWith('cards_') && key.endsWith('_lastRun')) {
            const thatYear = new Date(JSON.parse(localStorage.getItem(key))).getFullYear();
            const thisYear = new Date().getFullYear();

            if (thatYear + 1 < thisYear) {
                for (const key2 in localStorage) {
                    if (key2.startsWith(key.slice(0, -8))) {
                        localStorage.removeItem(key2);
                    }
                }
            }
        }
    }
}

function slugify(string) {
    string = replaceAll(string.toLowerCase(), 'říšžťčýůňúěďáéóě', 'risztcyunuedaeoe');
    return string.replace(/\W/g, ' ').trim().replace(/\s+/g, '-');
}

function replaceAll(str, arr1, arr2) {
    var re = new RegExp(arr1.split('').join('|'), 'gi');

    return str.replace(re, function (matched) {
        return arr2[arr1.indexOf(matched)];
    });
}

function resetPrompt() {
    if (confirm('Opravdu chceš začít od začátku?')) {
        reset();
    }
}

function reset() {
    clearState();
    currentRun = undefined;
    localStorage.setItem(lsPrefix + 'currentRun', currentRun);
    visitedCards = {};
    localStorage.setItem(lsPrefix + 'visitedCards', JSON.stringify(visitedCards));
    cardsToVisit = [];
    updateStats();
    showOrHideControls();
    showCurrentCard();
}

function clearState() {
    currentCard = undefined;
    lastCards = [];
    localStorage.setItem(lsPrefix + 'lastCards', JSON.stringify(lastCards));
    lcPointer = -1;
    localStorage.setItem(lsPrefix + 'lcPointer', lcPointer);
}

function startRun(number) {
    clearState();
    localStorage.setItem(lsPrefix + 'lastRun', JSON.stringify(new Date()));
    currentRun = number;
    localStorage.setItem(lsPrefix + 'currentRun', currentRun);
    generateCardsToVisit();
    next();
    updateStats();
    showOrHideControls();
}

function generateCardsToVisit() {
    cardsToVisit = cardIds.filter(id => !lastCards.includes(id)
        && (!(id in visitedCards) || visitedCards[id] <= currentRun));
}

function pickRandomCard() {
    let randomIndex = Math.floor(Math.random() * cardsToVisit.length);
    lastCards.push(cardsToVisit[randomIndex]);
    localStorage.setItem(lsPrefix + 'lastCards', JSON.stringify(lastCards));
    cardsToVisit.splice(randomIndex, 1);
}

function next() {
    if (!currentCard || currentCard in visitedCards) {
        if (lcPointer === lastCards.length - 1) {
            if (cardsToVisit.length) {
                pickRandomCard();
            } else {
                lcPointer++;
                currentCard = undefined;
                localStorage.setItem(lsPrefix + 'lcPointer', lcPointer);
                showCurrentCard();
                return;
            }
        }

        lcPointer++;
        localStorage.setItem(lsPrefix + 'lcPointer', lcPointer);
        currentCard = lastCards[lcPointer];
        showCurrentCard();
    }
}

function previous() {
    if (lcPointer > 0) {
        lcPointer--;
        localStorage.setItem(lsPrefix + 'lcPointer', lcPointer);
        currentCard = lastCards[lcPointer];
        showCurrentCard();
    }
}

function mark(number) {
    visitedCards[currentCard] = number;
    localStorage.setItem(lsPrefix + 'visitedCards', JSON.stringify(visitedCards));
    updateStats();
    next();
}

function exportData() {
    document.getElementById('exporthere').textContent = document.getElementById('exporthere').textContent
        ? '' : JSON.stringify({ currentRun, lastCards, lcPointer, visitedCards });
}

function importData() {
    const data = prompt('Vlož JSON data k importu:');

    if (data != null) {
        const dataObj = JSON.parse(data);
        ({ currentRun, lastCards, lcPointer, visitedCards } = dataObj);
        someCalls();
        saveCurrentState();
    }
}

function hideAllCards() {
    Array.from(document.getElementsByClassName('card')).forEach(element => {
        element.classList.remove('show');
        element.classList.remove('flip');
    });
}

function showCurrentCard() {
    hideAllCards();

    if (currentCard) {
        document.getElementById(currentCard).classList.add('show');
    }

    document.getElementById('controls').classList.toggle('nocard', !currentCard);
    document.getElementById('welldone').classList.toggle('show', !currentCard && currentRun !== undefined);
    document.getElementById('controls').classList.toggle('first', lcPointer === 0);
    document.getElementById('controls').classList.toggle('last', (lcPointer === lastCards.length - 1 && !(currentCard in visitedCards)));

    document.getElementById('progress').textContent = (lcPointer + 1)
        + '/' + (lastCards.length + cardsToVisit.length);
}

function updateStats() {
    let numbers = [undefined, 0, 0, 0, 0];
    let visited = 0;

    for (const card in visitedCards) {
        numbers[visitedCards[card]]++;
        visited++;
    }

    const displayRun = {
        '-1': 'nenavštívené',
        1: '≤ 1',
        2: '≤ 2',
        3: '≤ 3',
        4: 'všechny'
    }

    document.getElementById('stats').innerHTML = '<i>' + (cardIds.length - visited)
        + '</i><i>' + numbers.slice(1).join('</i><i>') + '</i>'
        + (currentRun ? `<span class="current-run">${displayRun[currentRun]}</span>` : '');
}

function showOrHideControls() {
    if (currentRun !== undefined) {
        document.getElementById('controls').classList.add('show');
    } else {
        document.getElementById('controls').classList.remove('show');
    }
}

function hideTop(hide) {
    document.body.classList.toggle('hidetop', hide);
}
