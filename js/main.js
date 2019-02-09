"use strict";

// TODO: jaa tämä useaan tiedostoon tai muuten selkeytä

let width = 960,
    height = 500;
const defaultRotationLongitude = -180;

let projection = d3.geo.equirectangular() //mercator()
    .center([0, 5 ])
    .scale(150)
    .rotate([defaultRotationLongitude, 0, 0]);

const svg = d3.select("#map-holder").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("style", 'border-style: solid');
const g = svg.append("g");

// path on jonkinlainen objekti joka generoi polun koordinaatit svg:n d-attribuutille sopivaksi.
// projection (joka annetaan argumenttina tässä) on funktio, joka muuttaa koordinaatit [x, y]
// projektion mukaisiksi.
const path = d3.geo.path()
    .projection(projection);

/*
    Lista seuraavanlaisia objecteja: maan nimi, sentroidipituus- ja leveys, maan id.
 */
let countryData = [];
let countryNames = null;
let centroidData = null;

// TODO: tämä pitäisi hommata modelista niin, että otetaan sijaintimaa.sentroidi
// TODO: kun tarvitaan tokeneiden koordinaatit, voisi ottaa ne TS:stä functiolla
// Lista seuraavanlaisia objekteja: { malli-token-objekti, countryData entry }
let tokenData = [];
let selectedTokens = [];

const centroidFill = "rgba(255, 128, 0, 1)";
const maxZoomScale = 50;
let tokenStacksByOwner = false;
let defaultTokenDistanceFromCentroid = 10; //10; // Distance from centroid to token circle's center.

initializeDocument();

// load and display the World
d3.json("world-110m.json", function(error, topology) {

    const pathDataArray = topojson.feature(topology, topology.objects.countries).features
        // add other stuff to the data in addition to topjson features
        .map(function(element){
            element.isCountry = true;
            return element;
        });// Each element of the array will be datum of an D3/DOM element.

    console.log("pathDataArray:", pathDataArray);
    g.selectAll("path")
        .data(pathDataArray)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "black")
        .attr("stroke", "red")
        .attr("stroke-width", "1");
        //.on("click", handleCountryClick); This is replaced with universal click handler.

    // TODO: mihin tätä käytetään?
    //var countries = topojson.feature(topology, topology.objects.countries).features;

    d3.tsv("world-country-names.tsv", function(data){
        countryNames = data;
        console.log("country names:", countryNames);
        playerService.initializePlayerData();
        updateCurrentPlayerInfo();
        initializeCountryData(pathDataArray);
        updateCentroidCircles();
        updateToppingCircles();
    });
});

// zoom and pan
var zoom = d3.behavior.zoom()
    .on("zoom",function() {
        const newScale = d3.event.scale;
        const yTranslation = d3.event.translate[1];
        const currentRotation = projection.rotate();
        const longitudeAmount = (d3.event.translate[0] / (width * newScale)) * 360;
        projection.scale(newScale * 150);
        const latitudeAmount = (d3.event.translate[1] / (height * newScale)) * 180;
        //console.log(latitudeAmount + 5);
        projection.center([0, latitudeAmount + 5]);
        projection = projection.rotate(
            [longitudeAmount + defaultRotationLongitude, currentRotation[1], currentRotation[2]]);

        // FYI: d3.event.translate on zoom-objectin arvo.
        //console.log("translation1:", d3.event.translate, "scale:", d3.event.scale);

        updateToppingCircles();
        updateCentroidCircles();

        // path.projection palauttaa funktion. Joten miten sen voi asettaa HTML-elementin
        // attribuutin arvoksi? - Funktiota ei asetettane suoraan arvoksi, vaan d3:ssa
        // voi asettaa arvon funktiolla jotenkin.
        g.selectAll("path")
            .attr("d", path.projection(projection));
        // Compensate for stroke width change which is caused by zoom, so that the width remains constant.
        //g.selectAll("path")
        //    .attr("stroke-width", calculateNewStrokeWidth(d3.event.scale, 1));
    })
    .scaleExtent([1, maxZoomScale]);

svg.call(zoom);

function initializeDocument(){
    document.addEventListener("click", universalClickHandler);
    /* TODO: jos halutaan tunnistaa muiden kuin shift ym. helposti tunnistettavia näppäimien pohjassapito.
    document.addEventListener("keyup", function(event){
        console.log("key up:", event.key);
    });
    document.addEventListener("keydown", function(event){
        console.log("key down:", event.key, event.key === "a");
    });*/
}



/*************************** Data for rendering ******************************/

function initializeCountryData(topology){
    centroidData = dataForRendering.initializeCentroidData(topology);
    countryData = dataForRendering.initializeCountryData(topology, centroidData, countryNames);
}

function updateTokenData(){
    const newTokenData = dataForRendering.updateTokenData(countryData);
    tokenData = newTokenData;
}

/*************************** Data for rendering ends ******************************/



/****************************Update functions *************************************/

function updateCentroidCircles(){
    const extendedCentroidData = centroidData.map(function(element){
        const centroidEntry = {centroid: element};
        centroidEntry.isCentroid = true;
        return centroidEntry;
    });
    let selection = g.selectAll(".centroid").data(extendedCentroidData);
    selection.enter()
        .append("circle")
        .attr("class", "centroid")
        .attr("r", 5)
        .attr("fill", centroidFill);
    selection
        .attr("cx", function(d) {
            const centroid = d.centroid;
            return projection([centroid[0], centroid[1]])[0];
        })
        .attr("cy", function(d) {
            const centroid = d.centroid;
            return projection([centroid[0], centroid[1]])[1];
        });
    drawInCorrectOrder();
}

function updateToppingCircles(){
    updateTokenData();
    let selection = g.selectAll(".topping-circle").data(tokenData);
    selection.enter()
        .append("circle")
        .attr("class", "topping-circle")
        .attr("data-token-id", function(d){
            return d.token.id; // TODO: on tarkoitus olla yksi entry ja eri jokaisella
        })
        .style("fill", playerService.currentPlayer.color)
        .attr("r", 10)
        .attr("stroke-width", 2) // Not visible if stroke attribute is empty.
        .attr("stroke-dasharray", "5,5"); // Not visible if stroke attribute is empty.
    selection
        .attr("cx", function(d) {
            const centroid = d.countryPresentation.centroid;
            return projection([centroid[0], centroid[1]])[0];
        })
        .attr("cy", function(d) {
            const centroid = d.countryPresentation.centroid;
            return projection([centroid[0], centroid[1]])[1];
        })
        .attr("transform", function(d) {
            const country = d.countryPresentation;
            const owner = d.token.owner;
            let tokenTranslation = null;
            if (tokenStacksByOwner) {
                tokenTranslation = getTokenTranslationFromOwnerAndCountry(country, owner);
            }else{
                // Tokens of same owner are not stacked.
                tokenTranslation = getSpreadTokenTranslationByOwnerAndCountry(country, d.token);
            }
            const x = tokenTranslation.x;
            const y = tokenTranslation.y;
            const translationString = "translate("+x+","+y+")";
            return translationString;
        })
        .attr("stroke", function(d){
            const contains = selectedTokens.find(function(element){
                return element.token.id === d.token.id;
            });
            if(!contains){
                //console.log("wasn't found in selected elements");
                return ""; // No stroke.
            }else{
                return "red";
            }
        });
    updateTokenStackNumbers();
}

function updateTokenStackNumbers(){
    const textElementData = dataForRendering.getTextElementData(countryData);
    let selection = g.selectAll(".token-counter-number").data(textElementData);
    selection
        .enter()
        .append("text")
        //.attr("class", "token-counter-number")
        .attr("stroke", "white")
        .attr("stroke-width", "0.5")
        .classed({"token-counter-number": true, "unselectable-text": true});
    selection
        .attr("x", function(d){
            return projection([d.lon, d.lat])[0];
        })
        .attr("y", function(d){
            return projection([d.lon, d.lat])[1];
        })
        .attr("transform", function(d){
            const country = d.countryPresentation;
            const owner = d.owner;
            const tokenTranslation = getTokenTranslationFromOwnerAndCountry(country, owner);
            const x = tokenTranslation.x;
            const y = tokenTranslation.y;
            const translationString = "translate("+x+","+y+")";
            return translationString;
        })
        .text(function(d){
            return "" + d.amountOfTokens;
        });
    selection.exit().remove();
    drawInCorrectOrder()
}

function updateCurrentPlayerInfo(){
    $('#current-player-info').text(playerService.currentPlayer.name);
}

/*
    Re-orders elements in the DOM so that they are drawn on top of each other in the correct order.
 */
function drawInCorrectOrder(){
    const mapElements = g.selectAll("*");
    // Those that are before in the order are drawn behind those that are after.
    const comparator = function(beforeElementData, afterElementData){
        // Return positive value if beforeElement should be before afterElement, and vice versa,
        // or zero value for arbitrary order.
        const beforeElementPriority = getElementPriority(beforeElementData);
        const afterElementPriority = getElementPriority(afterElementData);
        if(afterElementPriority === beforeElementPriority){
            return 0;
        }else if(beforeElementPriority > afterElementPriority){
            return 1;
        }else{
            return -1;
        }
    };
    mapElements.sort(comparator); // This re-orders selected elements in the DOM.
}

/*
    Pre-condition: owner is a Player object.
    TODO funktion nimi
 */
function getTokenTranslationFromOwnerAndCountry(countryPresentation, owner){
    console.assert(owner.color !== undefined); // does it look like a Player object. // TODO horrible
    const ownersWithTokensPresent = dataForRendering.getOwnersPresentInCountry(countryPresentation);
    const slotAmount = ownersWithTokensPresent.length;
    const slotIndex = getTokenSlotIndex(ownersWithTokensPresent, owner);
    console.assert(slotIndex > -1 && slotIndex < slotAmount);
    const tokenTranslation = calculateTokenTranslation(defaultTokenDistanceFromCentroid, slotAmount, slotIndex);
    return tokenTranslation;
}

/*
    Same as getTokenTranslationFromOwnerAndCountry, except tokens are not stacked.
 */
function getSpreadTokenTranslationByOwnerAndCountry(countryPresentation, token){
    const tokensPresent = tokenService.getTokensInCountry(countryPresentation.country.id);
    const slotAmount = tokensPresent.length;
    const slotIndex = getSpreadTokenSlotIndex(tokensPresent, token);
    const tokenTranslation = calculateTokenTranslation(defaultTokenDistanceFromCentroid, slotAmount, slotIndex);
    return tokenTranslation;
}

/*
    Returns slot index of thisToken when tokens are arranged by first their owner and second by their id
    and every token of has tokensPresent it's own slot.
 */
function getSpreadTokenSlotIndex(tokensPresent, thisToken){
    const slotPriorityComparator = function(token1, token2){
        console.assert(token1.id !== undefined);
        console.assert(token2.id !== undefined);
        console.assert(token1.owner.name !== undefined);
        console.assert(token2.owner.name !== undefined);
        if(token1.owner === token2.owner) {
            if (token1.id < token2.id) { return -1; }
            if (token1.id > token2.id) { return 1; }
            return 0;
        }else{
            if(token1.owner.name < token2.owner.name){ return -1; }
            if(token1.owner.name > token2.owner.name){ return 1; }
            return 0;
        }
    };
    const shallowCopyTokensPresent = tokensPresent.slice(); // Sorting will mutate the array so copy it.
    shallowCopyTokensPresent.sort(slotPriorityComparator);
    const slotAmount = shallowCopyTokensPresent.length;
    const slotIndex = shallowCopyTokensPresent.findIndex(e => e === thisToken);
    console.assert(slotIndex > -1 && slotIndex < slotAmount);
    return slotIndex;
}

function getTokenSlotIndex(ownersPresent, thisOwner){
    const slotPriorityComparator = function(owner1, owner2){
        console.assert(owner1.name !== undefined);
        console.assert(owner2.name !== undefined);
        if(owner1.name < owner2.name){ return -1; }
        if(owner1.name > owner2.name){ return 1; }
        return 0;
    };
    const shallowCopyOwnersPresent = ownersPresent.slice(); // Sorting will mutate the array so copy it.
    shallowCopyOwnersPresent.sort(slotPriorityComparator);
    const slotAmount = shallowCopyOwnersPresent.length;
    const slotIndex = shallowCopyOwnersPresent.findIndex(e => e === thisOwner);
    console.assert(slotIndex > -1 && slotIndex < slotAmount);
    return slotIndex;
}

function getElementPriority(elementData){
    const background = (1000 * 1000 * 1000) * (-1);
    const movableThing = 0;
    const movableLabel = 1000 * 1000;
    if(elementData.isCentroid === true){
        return background + 1;
    }
    if(elementData.isToken === true){
        return movableThing;
    }
    if(elementData.isLabel === true){
        return movableLabel;
    }
    return background;
}

/*
    distanceFromCenter is distance of the tokens's center from translation origin point.
    slotAmount is how many slots there are in the area.
    slotIndex determines which slot of the slots this token occupies (so slotIndex < slotAmount).
 */
function calculateTokenTranslation(distanceFromCenter, slotAmount, slotIndex){
    console.assert(slotIndex < slotAmount);
    // 1 slot -> 0 degrees
    // 2 slots -> 0 and 180 degrees
    // 3 slots -> 0, 120 and 240 degrees, etc.
    const angleDegreesIncrementPerSlot = 360 / slotAmount;
    const angleDegrees = angleDegreesIncrementPerSlot * slotIndex; // index is 0-based.
    const angleRadians = (angleDegrees * Math.PI) / 180;
    let x = Math.cos(angleRadians) * distanceFromCenter;
    let y = Math.sin(angleRadians) * distanceFromCenter;
    // Radians start at (r, 0), but translation should start at (0, r).
    // So make x into y and y into x.
    let oldX = x;
    x = y;
    y = oldX;
    // calculateTokenTranslation assumes y grows upwards,
    // but it grows downwards with svg elements. So flip y axis.
    y = -y;
    return {x: x, y: y};
}

/**************************** Update functions ends *************************************/



/**************************** User actions *************************************/

function universalClickHandler(event){
    const target = event.target;
    console.log("event target:");
    console.log(target);
    const targetD3 = d3.select(target);
    const datum = targetD3.datum();
    if(datum !== undefined) {
        if(datum.isCountry) {
            const countryId = datum.id;
            if(event.ctrlKey) {
                const countryName = dataForRendering.getCountryNameById(countryId, countryNames); // TODO: mihin tätä tarvitaan?
                addToken(countryId);
            }else if(event.shiftKey) {
                const countryEntry = countryData.find(x => x.country.id === countryId);
                console.assert(countryEntry !== undefined);
                const centroid = countryEntry.centroid;
                //console.log("country entry:", countryEntry);
                const selectedTokens3Dselection = d3.selectAll('.topping-circle').filter(function (d) {
                    // TODO: for luupissa on max 1 kierros. Bugi?
                    for (let selectedTokenDatum of selectedTokens) {
                        return d.token.id === selectedTokenDatum.token.id;
                    }
                });
                // Update model before rendering transition.
                for (let selectedTokenDatum of selectedTokens) {
                    //console.log("selectedTokenDatum", selectedTokenDatum);
                    tokenService.moveToken(selectedTokenDatum.token.id, countryEntry.country.id);
                }
                console.log("selectedTokens3Dselection", selectedTokens3Dselection);
                transitionTokens(selectedTokens3Dselection, centroid);
                // TODO: jostakin syystä jos tässä kutsutaan updateToppingCircles, se keskeyttää transition,
                // mutta jos sitä kutsutaan muuten transition aikana, se ei keskeytä sitä. Miksi?
            }else{
                selectedTokens = [];
                updateToppingCircles();
                console.log("Nothing here yet");
            }
        }
        else if(datum.isToken) {
            const tokenId = datum.token.id;
            console.assert(tokenId !== undefined);
            console.log("token clicked:", tokenId);
            selectedTokens = [];
            if (!selectedTokens.find(x => datum.token.id === x.token.id)) {
                selectedTokens.push(datum);
                console.log("tokenD3", targetD3.datum());
                updateToppingCircles();
            }
        }
    }else{
        selectedTokens = [];
        updateToppingCircles();
    }
}

/*
    Pre-condition: countryId is a valid country id.
 */
function addToken(countryId){
    const countryEntry = dataForRendering.getCountryEntryById(countryId, countryData);
    if(countryEntry === undefined){
        console.log("countryEntry is undefined");
        return;
    }
    tokenService.addToken(countryEntry.country.id, playerService.currentPlayer);
    updateToppingCircles();
}

function transitionTokens(selectedTokens3Dselection, targetGeographicCoordinates){
    selectedTokens3Dselection.transition()
        .each("end", function(){
            updateToppingCircles();
        })
        .duration(1000)
        .attr("cx", function(d) {
            return projection([targetGeographicCoordinates[0], targetGeographicCoordinates[1]])[0];
        })
        .attr("cy", function(d) {
            return projection([targetGeographicCoordinates[0], targetGeographicCoordinates[1]])[1];
        });
    drawInCorrectOrder();
}

// TODO: vuoromanageriin tai jonnekin
function handleNextPlayerTurn(){
    const currentPlayerIndex = playerService.players.findIndex(player => player === playerService.currentPlayer);
    console.assert(currentPlayerIndex > -1);
    if(currentPlayerIndex === playerService.players.length - 1){
        playerService.currentPlayer = playerService.players[0];
    }else{
        playerService.currentPlayer = playerService.players[currentPlayerIndex + 1];
    }
    updateCurrentPlayerInfo();
}

/**************************** User actions ends *************************************/



/**************************** Other *************************************/

/* meh
function countOccurrencesInArray(array, condition){
    const counted = array.reduce(function(allOccurrences, occurrence){
        if(occurrence in allOccurrences){
            allOccurrences[occurrence]++;
        }else{
            allOccurrences[occurrence] = 1;
        }
        return allOccurrences;
    }, {});
    return counted;
}*/

/* TODO: jos halutaan käyttää d3:n .on() metodia maan kuuntelemiseen
function handleCountryClick(d, i){
    const countryName = getCountryNameById(d.id);
    console.log("clicked:", countryName, "id:", d.id);
    //alert(countryName + "Click'd!");
    //console.log("datum:", d);
    //console.log("index:", i);
}*/

/*
    TODO: Poissa käytöstä.
 */
function calculateNewStrokeWidth(scale, normalWidth){
    return (normalWidth / scale).toString();
}

/* TODO: jos halutaan piirrellä viivoja
g.append("line")
    .attr("x1", "0")
    .attr("y1", "0")
    .attr("x2", "200")
    .attr("y2", "200")
    .attr("stroke", "rgb(255,0,0)")
    .attr("stroke-width", "2");
    //.style("stroke:rgb(255,0,0);stroke-width:2");*/