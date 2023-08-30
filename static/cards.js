// currentCard = id of current card
// cardsToVisit = cards which will be visited in this run because they suit the constraints (list of ids)
// → variables above are not stored in localStorage, those below are stored in there
// currentRun = number setting the constraint (level)
// lastCards = list of cards visited in this run (list of ids)
// lcPointer = current position in lastCards array (index of currentCard)
// visitedCards = levels of visited cards (object … id: level)

var currentCard, cardsToVisit,
    currentRun, selectedCategories, lastCards, lcPointer, visitedCards,
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
    const tempSC = localStorage.getItem(lsPrefix + 'selectedCategories');
    selectedCategories = tempSC ? JSON.parse(tempSC) : [[], []];

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

    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.addEventListener('keydown', event => {
            if (event.code == 'Enter') {
                el.click();
            }
        });
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
    prepareCheckboxes();
}

// localStorage stuff

function saveCurrentState() {
    lsSet('currentRun');
    lsSet('selectedCategories');
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
        case 'selectedCategories':
            localStorage.setItem(lsPrefix + 'selectedCategories', JSON.stringify(selectedCategories));
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
    selectedCategories = [[], []];
    lsSet('selectedCategories');
    cardsToVisit = [];
    updateStats();
    showOrHideControls();
    showCurrentCard();
    prepareCheckboxes();
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

// checkbox functions

function prepareCheckboxes() {
    document.getElementById('filtersactive').checked = false;
    document.getElementById('filters').classList.remove('show');

    if (selectedCategories[0].length + selectedCategories[1].length > 0) {
        document.getElementById('filtersactive').click();
    }

    [...document.getElementById('filters').children[0].getElementsByTagName('input')].forEach(el => {
        el.checked = selectedCategories[0].includes(el.getAttribute('data-title'));
    });
    [...document.getElementById('filters').children[1].getElementsByTagName('input')].forEach(el => {
        el.checked = selectedCategories[1].includes(el.getAttribute('data-title'));
    });
}

function toggleFilters() {
    const newState = document.getElementById('filtersactive').checked;
    const lastCatLen = selectedCategories[0].length + selectedCategories[1].length;

    if (newState) {
        document.getElementById('filters').classList.add('show');
    } else {
        selectedCategories = [[], []];
        lsSet('selectedCategories');
        prepareCheckboxes();

        if (currentRun !== undefined && lastCatLen > 0) {
            startRun(currentRun);
        }
    }
}

function toggleFilter(group, category, element) {
    if (element.checked) {
        if (!selectedCategories[group].includes(category)) {
            selectedCategories[group].push(category);
        }
    } else {
        const index = selectedCategories[group].indexOf(category);

        if (index !== -1) {
            selectedCategories[group].splice(index, 1);
        }
    }

    lsSet('selectedCategories');

    if (currentRun !== undefined) {
        startRun(currentRun);
    }
}

function isAllowedByCategoryFilter(id) {
    return ((selectedCategories[0].length == 0 || selectedCategories[0].includes(cardCategories[id][0]))
        && (selectedCategories[1].length == 0 || selectedCategories[1].includes(cardCategories[id][1])));
}

// card background functions

function generateCardsToVisit() {
    cardsToVisit = cardIds.filter(id => !lastCards.includes(id)
        && (!(id in visitedCards) || visitedCards[id] <= currentRun) && isAllowedByCategoryFilter(id));
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
    if (document.getElementById('exporthere').textContent) {
        document.getElementById('exporthere').textContent = '';
        document.getElementById('exportbtn').textContent = 'export';
    } else {
        document.getElementById('exporthere').textContent = JSON.stringify({ currentRun, selectedCategories, lastCards, lcPointer, visitedCards });
        document.getElementById('exportbtn').textContent = 'skrýt export';
    }
}

function importData() {
    const data = prompt('Vlož JSON data k importu:');

    if (data != null) {
        const dataObj = JSON.parse(data);
        ({ currentRun, selectedCategories =[[], []], lastCards, lcPointer, visitedCards } = dataObj);
        someInitialCalls();
        saveCurrentState();
        prepareCheckboxes();
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
