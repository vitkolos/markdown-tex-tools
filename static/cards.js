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
    document.getElementById(currentCard).classList.toggle('flip');
}

function initialize() {
    // load data from local storage
    localStorage.setItem(lsPrefix + 'lastRead', JSON.stringify(new Date()));
    cleanOldLS();
    // determine if run is started and restore state accordingly
    visitedCards = {};
    updateStats();
}

function cleanOldLS() {
    // this needs to be tested
    for (const key in localStorage) {
        if (key.startsWith('cards_') && key.endsWith('_lastRead')) {
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
    currentRun = number;
    localStorage.setItem(lsPrefix + 'currentRun', currentRun);
    cardsToVisit = cardIds.filter(id => !lastCards.includes(id)
        && (!(id in visitedCards) || visitedCards[id] <= currentRun));
    next();
    updateStats();
    showOrHideControls();
}

function pickRandomCard() {
    let randomIndex = Math.floor(Math.random() * cardsToVisit.length);
    lastCards.push(cardsToVisit[randomIndex]);
    localStorage.setItem(lsPrefix + 'lastCards', JSON.stringify(lastCards));
    cardsToVisit.splice(randomIndex, 1);
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

    document.getElementById('progress').textContent = (lcPointer + 1)
        + '/' + (lastCards.length + cardsToVisit.length);
}

function next() {
    if (!currentCard || currentCard in visitedCards) {
        if (lcPointer === lastCards.length - 1) {
            if (cardsToVisit.length) {
                pickRandomCard();
            } else {
                lcPointer++;
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

function updateStats() {
    let numbers = [0, 0, 0, 0];
    let visited = 0;

    for (const card in visitedCards) {
        numbers[visitedCards[card]]++;
        visited++;
    }

    document.getElementById('stats').textContent = (cardIds.length - visited)
        + '/' + numbers.join('/') + (currentRun ? ' – procházená úroveň: ' + currentRun : '');
}

function showOrHideControls() {
    if (currentRun !== undefined) {
        document.getElementById('controls').classList.add('show');
    } else {
        document.getElementById('controls').classList.remove('show');
    }
}
