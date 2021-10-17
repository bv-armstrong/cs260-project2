function removeForm() {
    document.getElementById("entryForms").remove();
}

function setGameIDField(deckId, playerId) {
    let innerText = '';
    if (deckId !== undefined) {
        innerText += 'Game ID: ' + deckId;
    }
    if (playerId !== undefined) {
        innerText += '\nPlayer ID: ' + playerId;
    }
    document.getElementById("gameId").innerText = innerText;
}

document.getElementById("createNewGame").addEventListener("click", function(event) {
    event.preventDefault();

    const numPlayers = parseInt(document.getElementById("numPlayers").value);

    const url = "http://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1";
    fetch(url).then(function (response) {
        return response.json();
    }).then(async function (json) {
        console.log(json);
        const deckId = json.deck_id;
        const baseURL = "http://deckofcardsapi.com/api/deck/" + deckId;
        const count = Math.floor(52 / numPlayers);
        const drawURL = baseURL + "/draw/?count=" + count;
        for (let i = 1; i <= numPlayers; i++) {
            let json = await fetch(drawURL).then(function (response) {
                return response.json();
            });
            let pileURL = baseURL + "/pile/player" + i + "/add/?cards=";
            let first = true;
            for (let card of json.cards) {
                if (!first) {
                    pileURL += ',';
                } else {
                    first = false;
                }
                pileURL += card.code;
            }
            console.log(pileURL);
            await fetch(pileURL);
        }
        return deckId;
    }).then(function (deckId) {
        document.getElementById("createGameForm").remove();
        document.getElementById("gameInput").value = deckId;
        setGameIDField(deckId);
    }).catch(function () {
        console.log("error");
    })
})

document.getElementById("gameSubmit").addEventListener("click", function(event) {
    event.preventDefault();

    const deckId = document.getElementById("gameInput").value;
    const playerNumber = document.getElementById("playerNumber").value;

    const baseUrl = "http://deckofcardsapi.com/api/deck/" + deckId;
    const pileUrl = baseUrl + '/pile/player' + playerNumber + '/list/';
    console.log(pileUrl);
    fetch(pileUrl).then(function (response) {
        return response.json();
    }).then(function (json) {
        setGameIDField(deckId, 'player'+playerNumber);
        let results = '';
        let cards = json.piles['player' + playerNumber].cards;
        cards = cards.sort((card1, card2) => CARD_VALUES[card1.value] - CARD_VALUES[card2.value]);
        for (let card of cards) {
            console.log(card);
            results += '<div class="handCard" id="'+card.code+'-div"><img src="' + card.image + '" class="cardImage" id="' + card.code + '" alt="' + card.code + '"/></div>';
        }
        removeForm();
        refresh(deckId);
        document.getElementById("discard").addEventListener("click", function(event) {
            event.preventDefault();
            refresh(deckId);
        });
        if (playerNumber === '1') {
            document.getElementById("clearDiscard").innerHTML = '<input type="button" value="Clear Discard" id="clearDiscardButton"/>';
            document.getElementById("clearDiscardButton").addEventListener("click", function(event) {
                event.preventDefault();
                const getDiscardURL = baseUrl + '/pile/discard/list/';
                fetch(getDiscardURL).then(function (response) {
                    return response.json();
                }).then (function (json) {
                    console.log(json);
                    if (json.piles["discard"] !== undefined) {
                        let url = baseUrl + '/pile/outofplay/add/?cards=';
                        let first = true;
                        for (let card of json.piles["discard"].cards) {
                            if (!first) {
                                url += ',';
                            } else {
                                first = false;
                            }
                            url += card.code;
                        }
                        fetch (url).then(function(response) {
                            console.log(response.json());
                            refresh(deckId);
                        });
                    }
                })
            })
        }
        document.getElementById("cards").innerHTML = results;
        setImageEventHandlers(deckId);
    }).catch(function () {
        console.log("error");
    });
})

const CARD_VALUES = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    "JACK": 11,
    "QUEEN": 12,
    "KING": 13,
    "ACE": 14,
    "0": 10,
    "J": 11,
    "Q": 12,
    "K": 13,
    "A": 14
}

function setImageEventHandlers(deckID) {
    const cardImages = document.getElementsByClassName("cardImage");
    for (let cardImage of cardImages) {
        let code = cardImage.alt;
        cardImage.addEventListener("click", function (event) {
            event.preventDefault();
            playCard(deckID, code)
        });
    }
}

function canPlay(currentCard, cardToPlay) {
    if (currentCard === undefined) {
        return true;
    } else {
        return (CARD_VALUES[cardToPlay[0]] > CARD_VALUES[currentCard[0]]);
    }
}

async function playCard(deckID, code) {
    console.log("Playing card: " + code);
    const url1 = 'http://deckofcardsapi.com/api/deck/' + deckID + '/pile/discard/list';
    fetch(url1).then(function (response) {
        return response.json();
    }).then(function (json) {
        console.log(json);
        let innerHTML = '<h2>Card in play</h2>';
        let currentCardCode;
        if (json.piles["discard"] !== undefined) {
            let cards = json.piles["discard"].cards;
            let currentCard = cards[cards.length - 1];
            if (currentCard !== undefined) {
                innerHTML += '<img src="' + currentCard.image + '" class="cardImage" id="' + currentCard.code + '" alt="' + currentCard.code + '"/>';
                currentCardCode = currentCard.code;
            }
        } else {
            currentCardCode = undefined;
        }
        innerHTML += '<p>(Click to refresh)</p>';
        document.getElementById("discard").innerHTML = innerHTML;

        if (canPlay(currentCardCode, code)) {
            const url = 'http://deckofcardsapi.com/api/deck/' + deckID + '/pile/discard/add/?cards=' + code;
            fetch(url).then(function (response) {
                return response.json();
            }).then(function (json) {
                document.getElementById(code+"-div").remove();
                refresh(deckID);
                document.getElementById("errorMessage").innerText = '';
            });
        } else {
            document.getElementById("errorMessage").innerText = 'Cannot Play Card';
        }
    });
}

function refresh(deckID) {
    const url = 'http://deckofcardsapi.com/api/deck/' + deckID + '/pile/discard/list';
    fetch(url).then(function (response) {
        return response.json();
    }).then (function (json) {
        console.log(json);
        let innerHTML = '<h2>Card in play</h2>';
        if (json.piles["discard"] !== undefined) {
            let cards = json.piles["discard"].cards;
            let card = cards[cards.length-1];
            if (card !== undefined) {
                innerHTML += '<img src="' + card.image + '" class="cardImage" id="' + card.code + '" alt="' + card.code + '"/>';
            } else {
                innerHTML += '<div class="emptyMessage"><p>(Empty)</p></div>'
            }
        }
        innerHTML += '<p>(Click to refresh)</p>';
        document.getElementById("discard").innerHTML = innerHTML;
    })
}