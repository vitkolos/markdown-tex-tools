// currentCard = id of current card
// cardsToVisit = cards which will be visited in this run because they suit the constraints (list of ids)
// → variables above are not stored in localStorage, those below are stored in there
// currentRun = number setting the constraint (level)
// lastCards = list of cards visited in this run (list of ids)
// lcPointer = current position in lastCards array (index of currentCard)
// visitedCards = levels of visited cards (object … id: level)

var currentCard, cardsToVisit, currentRun, lastCards, lcPointer, visitedCards;

if (typeof cardIds !== 'undefined') {
    initialize();
}

function flip() {
    document.getElementById(currentCard).classList.toggle('flip');
}

function initialize() {
    // load data from local storage
    // determine if run is started and restore state accordingly
    visitedCards = {};
    updateStats();
}

function startRun(number) {
    currentCard = undefined;
    currentRun = number;
    lastCards = [];
    lcPointer = -1;
    cardsToVisit = cardIds.filter(id => !lastCards.includes(id) && (!(id in visitedCards) || visitedCards[id] <= currentRun));
    next();
}

function pickRandomCard() {
    let randomIndex = Math.floor(Math.random() * cardsToVisit.length);
    lastCards.push(cardsToVisit[randomIndex]);
    cardsToVisit.splice(randomIndex, 1);
}

function hideAllCards() {
    Array.from(document.getElementsByClassName('card')).forEach(element => {
        element.classList.remove('show');
        element.classList.remove('flip');
    });
}

function showCurrentCard() {
    document.getElementById(currentCard).classList.add('show');
    document.getElementById('progress').textContent = (lcPointer + 1) + '/' + (lastCards.length + cardsToVisit.length);
}

function next() {
    if (!currentCard || currentCard in visitedCards) {
        if (lcPointer === lastCards.length - 1) {
            if (cardsToVisit.length) {
                pickRandomCard();
            } else {
                // finish
            }
        }

        lcPointer++;
        currentCard = lastCards[lcPointer];
        hideAllCards();
        showCurrentCard();
    }
}

function previous() {
    if (lcPointer > 0) {
        lcPointer--;
        currentCard = lastCards[lcPointer];
        hideAllCards();
        showCurrentCard();
    }
}

function mark(number) {
    visitedCards[currentCard] = number;
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

    document.getElementById('stats').textContent = (cardIds.length - visited) + '/' + numbers.join('/');
}
