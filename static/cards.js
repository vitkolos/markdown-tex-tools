// currentCard = id of current card
// cardsToVisit = cards which will be visited in this run because they suit the constraints (list of ids)
// → variables above are not stored in localStorage, those below are stored in there
// currentRun = number setting the constraint (level)
// lastCards = list of cards visited in this run (list of ids)
// lcPointer = current position in lastCards array (index of currentCard)
// visitedCards = levels of visited cards (object … id: level)

var currentCard, cardsToVisit,
    currentRun, lastCards, lcPointer, visitedCards,
    controlsElement, keysBlocked;

const lsPrefix = 'cards_' + slugify(decodeURIComponent(location.pathname)) + '_';

if (typeof cardIds !== 'undefined') {
    initialize();
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

    // helper element
    controlsElement = document.getElementById('controls');
    // this prevents accidental marking of multiple cards at once
    keysBlocked = false;

    someInitialCalls();

    document.addEventListener('keydown', event => {
        if (currentCard) {
            switch (event.code) {
                case 'Space':
                case 'Numpad0':
                    flip();
                    event.preventDefault();
                    return false;
                case 'ArrowRight':
                case 'KeyD':
                case 'NumpadAdd':
                    next();
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                case 'NumpadSubtract':
                    previous();
                    break;
                case 'KeyW':
                    window.scrollBy({ left: 0, top: -100, behavior: 'smooth' });
                    break;
                case 'KeyS':
                    window.scrollBy({ left: 0, top: 100, behavior: 'smooth' });
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Numpad1':
                case 'Numpad2':
                case 'Numpad3':
                case 'Numpad4':
                    if (!keysBlocked) {
                        keysBlocked = true;
                        mark(+event.code.slice(-1));
                    }
                    break;
            }
        } else if (currentRun !== undefined && event.code == 'ArrowLeft') {
            previous();
        }
    });

    document.addEventListener('keyup', event => {
        keysBlocked = false;
    });
}

function someInitialCalls() {
    if (currentRun !== undefined) {
        lsSet('lastRun');
        currentCard = lastCards[lcPointer];
    }

    generateCardsToVisit();
    showCurrentCard();
    updateStats();
    showOrHideControls();
    cleanOldLS();
}

// localStorage stuff

function saveCurrentState() {
    lsSet('currentRun');
    lsSet('lcPointer');
    lsSet('lastCards');
    lsSet('visitedCards');
}

function lsSet(name) {
    switch (name) {
        case 'currentRun':
            localStorage.setItem(lsPrefix + 'currentRun', currentRun);
            break;
        case 'lcPointer':
            localStorage.setItem(lsPrefix + 'lcPointer', lcPointer);
            break;
        case 'lastCards':
            localStorage.setItem(lsPrefix + 'lastCards', JSON.stringify(lastCards));
            break;
        case 'visitedCards':
            localStorage.setItem(lsPrefix + 'visitedCards', JSON.stringify(visitedCards));
            break;
    }
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

// start or reset functions

function resetPrompt() {
    if (confirm('Opravdu chceš začít od začátku?')) {
        reset();
    }
}

function reset() {
    clearState();
    currentRun = undefined;
    lsSet('currentRun');
    visitedCards = {};
    lsSet('visitedCards');
    cardsToVisit = [];
    updateStats();
    showOrHideControls();
    showCurrentCard();
}

function clearState() {
    currentCard = undefined;
    lastCards = [];
    lsSet('lastCards');
    lcPointer = -1;
    lsSet('lcPointer');
}

function startRun(number) {
    clearState();
    lsSet('lastRun');
    currentRun = number;
    lsSet('currentRun');
    generateCardsToVisit();
    next();
    updateStats();
    showOrHideControls();
}

// card background functions

function generateCardsToVisit() {
    cardsToVisit = cardIds.filter(id => !lastCards.includes(id)
        && (!(id in visitedCards) || visitedCards[id] <= currentRun));
}

function pickRandomCard() {
    let randomIndex = Math.floor(Math.random() * cardsToVisit.length);
    lastCards.push(cardsToVisit[randomIndex]);
    lsSet('lastCards');
    cardsToVisit.splice(randomIndex, 1);
}

// card controls

function next() {
    if (!currentCard || currentCard in visitedCards) {
        if (lcPointer === lastCards.length - 1) {
            if (cardsToVisit.length) {
                pickRandomCard();
            } else {
                lcPointer++;
                currentCard = undefined;
                lsSet('lcPointer');
                showCurrentCard();
                return;
            }
        }

        lcPointer++;
        lsSet('lcPointer');
        currentCard = lastCards[lcPointer];
        showCurrentCard();
    }
}

function previous() {
    if (lcPointer > 0) {
        lcPointer--;
        lsSet('lcPointer');
        currentCard = lastCards[lcPointer];
        showCurrentCard();
    }
}

function mark(number) {
    visitedCards[currentCard] = number;
    lsSet('visitedCards');
    updateStats();
    next();
}

function flip() {
    if (currentCard) {
        document.getElementById(currentCard).classList.toggle('flip');
    }
}

// data import/export

function exportData() {
    document.getElementById('exporthere').textContent = document.getElementById('exporthere').textContent
        ? '' : JSON.stringify({ currentRun, lastCards, lcPointer, visitedCards });
}

function importData() {
    const data = prompt('Vlož JSON data k importu:');

    if (data != null) {
        const dataObj = JSON.parse(data);
        ({ currentRun, lastCards, lcPointer, visitedCards } = dataObj);
        someInitialCalls();
        saveCurrentState();
    }
}

// visual stuff

function hideAllCards() {
    Array.from(document.getElementsByClassName('card')).forEach(element => {
        element.classList.remove('show');
        element.classList.remove('flip');
    });
}

function showCurrentCard() {
    hideAllCards();
    controlsElement.removeAttribute('data-level');

    if (currentCard) {
        document.getElementById(currentCard).classList.add('show');

        if (currentCard in visitedCards) {
            controlsElement.setAttribute('data-level', visitedCards[currentCard]);
        }
    }

    controlsElement.classList.toggle('nocard', !currentCard);
    controlsElement.classList.toggle('first', lcPointer === 0);
    controlsElement.classList.toggle('last', (lcPointer === lastCards.length - 1 && !(currentCard in visitedCards)));
    document.getElementById('welldone').classList.toggle('show', !currentCard && currentRun !== undefined);
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
    controlsElement.classList.toggle('show', currentRun !== undefined);
}

function hideTop(hide) {
    document.body.classList.toggle('hidetop', hide);
}
