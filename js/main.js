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
let players = []; // Array of player objects.
let currentPlayer = null; // A player object

const centroidFill = "rgba(255, 128, 0, 1)";

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
        initializePlayerData();
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
    .scaleExtent([1, 10]);

svg.call(zoom);

/* TODO: jos halutaan piirrellä viivoja
g.append("line")
    .attr("x1", "0")
    .attr("y1", "0")
    .attr("x2", "200")
    .attr("y2", "200")
    .attr("stroke", "rgb(255,0,0)")
    .attr("stroke-width", "2");
    //.style("stroke:rgb(255,0,0);stroke-width:2");*/

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

function initializePlayerData(){
    players = [
        {id: 8, name: "player1", color: "green"},
        {id: 9, name: "player2", color: "gold"},
        {id: 10, name: "player3", color: "aliceblue"}
    ];
    currentPlayer = players[0];
}

function initializeCountryData(topology){
    centroidData = topology
        .map(function(element){
            // return path.centroid(element); // "computes the projected centroid on the Cartesian plane"
            console.assert(d3.geo.centroid(element) !== undefined);
            return d3.geo.centroid(element); // "Returns the spherical centroid"
        });
    // 252 maan nimeä, mutta 177 topologiahommelia!
    for(let i = 0; i < topology.length; i++){
        // topology was in same order and of same length as centroid data.
        const featureEntry = topology[i];
        const centroid = centroidData[i];
        const featureIdNumber = parseInt(featureEntry.id);
        // Some features in the json area -99 and those are not countries.
        if(featureIdNumber === -99){
            console.log("was -99");
            continue;
        }
        const countryName = getCountryNameById(featureIdNumber);
        const newCountryEntry = {};
        newCountryEntry.name = countryName;
        newCountryEntry.centroid = centroid;
        newCountryEntry.id = featureIdNumber;
        countryData.push(newCountryEntry);
    }
    console.log("countryData:", countryData);
}

function updateTokenData(){
    let newTokenData = [];
    tokenService.tokens.forEach(function(element){
        const tokenModel = element;

        const countryId = element.location;
        const countryPresentation = getCountryEntryById(countryId);
        console.assert(countryPresentation !== undefined);
        const newTokenPresentation = {
            token: tokenModel,
            countryPresentation: countryPresentation,
            isToken: true
        };
        newTokenData.push(newTokenPresentation);
    });
    tokenData = newTokenData;
}

function getTextElementData(){
    /*
    TODO: kesken
    on oltava myös omistaja textElementEntryssä
    mutta miten voidaan päätellä translaatio?
    - jos tiedetään omistaja ja muut omistajat samalla alueella ja järjestysfunktio, niin voidaan
    mutta menee vaikeaksi
    Voisi laittaa g:n sisään, mutta kai täytyy laittaa kaikki saman väriset sitten sen sisään?
    Ja sitten menisi vaikeaksi jos siirretään token paikasta toiseen. Vai miksi menisi? Siiretään vain toisen
    g:n sisään.
    Toisaalta jos laittaa g-ryhmien sisään elementtejä, niin piirtojärjestyksen asettamisesta tulee hieman
    monimutkaisempaa.
    Jos ei haluta g-elementtejä, niin voidaan pistää johonkin globaaliin taulukkoon
    alue.omistaja.translaatio-data, ettei tarvitse laskea erikseen laabeleille. Tämä data laskettaisiin
    uudestaan aina tokenien päivityksen yhteydessä, ja tämä tarkoittaisi että laabeleiden päivittämistä
    ennen pitäisi aina luoda se data.
    Päätän nyt yrittää g-juttua. Mutta tieto omistajakohtaisesta lukumäärästä tarvitaan silti.
    Se voisi tulla suoraan tokeninpäivityfunktiolta, jos tai riippuvuuksien vähentämisen vuoksi ei?
    Translaatiota varten tämän ei tarvitse kuitenkaan tietää mitään.
     */
    const textElementData = [];
    tokenService.tokens.forEach(function(token){
        const countryId = token.location;
        const countryPresentation = getCountryEntryById(countryId);
        console.assert(countryPresentation !== undefined);

    });
    countryData.forEach(function(countryPresentation){
        const tokensInCountry = tokenService.getTokensInCountry(countryPresentation.id);
        getOwnersPresentInCountry
        if(tokensInCountry.length > 0){
            const newTextElementEntry = {
                lon: countryPresentation.centroid[0],
                lat: countryPresentation.centroid[1],
                amountOfTokens: tokensInCountry.length,
                owner: owner, // The owner of those tokens of which amount this text element displays.
                isLabel: true
            };
            textElementData.push(newTextElementEntry);
        }
    });
    countryData.forEach(function(countryPresentation){
        const tokensInCountry = tokenService.getTokensInCountry(countryPresentation.id);
        if(tokensInCountry.length > 0){
            const newTextElementEntry = {
                lon: countryPresentation.centroid[0],
                lat: countryPresentation.centroid[1],
                amountOfTokens: tokensInCountry.length,
                owner: owner, // The owner of those tokens of which amount this text element displays.
                isLabel: true
            };
            textElementData.push(newTextElementEntry);
        }
    });
    return textElementData;
}

/*
    Gets country entry from countryData by country id, or undefined if it doesn't exist.
 */
function getCountryEntryById(countryId){
    const countryEntry = countryData.find(function(element){
        return element.id === countryId;
    });
    return countryEntry;
}

/*
    Pre-condition: there is a country name for idString in countryNames.
 */
function getCountryNameById(idNumber){
    //const idNumber = parseInt(idString);
    const countryEntry = countryNames.find( entry => parseInt(entry.id) === idNumber );
    if(countryEntry === undefined){
        console.log("getCountryNameById: idNumber:", idNumber);
    }
    const name = countryEntry.name;
    console.assert(name !== undefined);
    return name;
}

/*
    Returns an array of Player objects.
 */
function getOwnersPresentInCountry(countryPresentation){
    const tokensInCountry = tokenService.getTokensInCountry(countryPresentation.id);
    const ownersPresent = [];
    tokensInCountry.forEach(function(token){
        const owner = token.owner;
        if(!(ownersPresent.includes(owner))){
            ownersPresent.push(owner);
        }
    });
    console.log("ownersPresent:", ownersPresent);
    return ownersPresent;
}

/*************************** Data for rendering ends ******************************/



/****************************Update functions *************************************/

function updateCentroidCircles(){
    const extendedCentroidData = centroidData.map(function(element){
        const centroidEntry = {centroid: element};
        centroidEntry.isCentroid = true;
        return centroidEntry;
    });
    //console.log("extendedCentroidData:", extendedCentroidData);
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
            // TODO: vai tarvitseeko olla vain yksi jokaisella? ylimääräisethän jäävät alle piiloon.
        })
        .style("fill", currentPlayer.color)
        .attr("r", 10)
        .attr("stroke-width", 2) // Not visible if stroke attribute is empty.
        .attr("stroke-dasharray", "5,5"); // Not visible if stroke attribute is empty.

    console.log("selected tokens:", selectedTokens);
    selection
        .attr("cx", function(d) {
            //console.log("d:", d);
            const centroid = d.countryPresentation.centroid;
            return projection([centroid[0], centroid[1]])[0];
        })
        .attr("cy", function(d) {
            const centroid = d.countryPresentation.centroid;
            return projection([centroid[0], centroid[1]])[1];
        })
        .attr("transform", function(d){
            const defaultDistanceFromCenter = 10; // Distance from centroid to token circle's center.
            const slotPriorityComparator = function(owner1, owner2){
                console.assert(owner1.name !== undefined);
                console.assert(owner2.name !== undefined);
                if(owner1.name < owner2.name){
                    return -1;
                }
                if((owner1.name > owner2.name)){
                    return 1;
                }
                return 0;
            };
            console.log("d", d);
            const country = d.countryPresentation;
            const ownersWithTokensPresent = getOwnersPresentInCountry(country);
            ownersWithTokensPresent.sort(slotPriorityComparator);
            const slotAmount = ownersWithTokensPresent.length;
            const owner = d.token.owner;
            const slotIndex = ownersWithTokensPresent.findIndex(e => e === owner);
            console.log("slotAmount:", slotAmount);
            console.log("slotIndex:", slotIndex);
            console.assert(slotIndex > -1 && slotIndex < slotAmount);
            const tokenTranslation = calculateTokenTranslation(defaultDistanceFromCenter, slotAmount, slotIndex);
            // calculateTokenTranslation assumes y grows upwards,
            // but it grows downwards with svg elements. So flip y axis.
            tokenTranslation.y = -tokenTranslation.y;
            const x = tokenTranslation.x;
            const y = tokenTranslation.y;
            const translationString = "translate("+x+","+y+")";
            console.log("translation string:", translationString);
            return translationString;
        })
        .attr("stroke", function(d){
            const contains = selectedTokens.find(function(element){
                //console.log("d:", d.token.id);
                //console.log("element:", element.token.id);
                //console.log("equals:", d.token.id === element.token.id);
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
    const textElementData = getTextElementData();
    //console.log("textElementData:", textElementData);
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
        .text(function(d){
            return "" + d.amountOfTokens;
        });
    selection.exit().remove();
    drawInCorrectOrder()
}

function updateCurrentPlayerInfo(){
    $('#current-player-info').text(currentPlayer.name);
}

/*
    Re-orders elements in the DOM so that they are drawn on top of each other in the correct order.
 */
function drawInCorrectOrder(){
    const mapElements = g.selectAll("*");
    //console.log("mapElements:", mapElements);
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

function getElementPriority(elementData){
    const background = (1000 * 1000 * 1000) * (-1);
    const movableThing = 0;
    const movableLabel = 1000 * 1000;
    //console.log("getElementPriority called");
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
    console.log("angleDegreesIncrementPerSlot", angleDegreesIncrementPerSlot);
    const angleDegrees = angleDegreesIncrementPerSlot * slotIndex; // index is 0-based.
    const angleRadians = (angleDegrees * Math.PI) / 180;
    console.log("angleRadians", angleRadians);
    console.log("Math.cos(angleRadians):", Math.cos(angleRadians));
    console.log("Math.sin(angleRadians):", Math.sin(angleRadians));
    console.log("distanceFromCenter", distanceFromCenter);
    const x = Math.cos(angleRadians) * distanceFromCenter;
    const y = Math.sin(angleRadians) * distanceFromCenter;
    // Radians start at (r, 0), but translation should start at (0, r).
    // So make x into y and y into x.
    return {x: y, y: x};
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
            if(!event.shiftKey) {
                const countryName = getCountryNameById(countryId);
                //console.log("datum:", datum);
                //console.log("countryName:", countryName);
                addToken(countryId);
            }else{
                const countryEntry = countryData.find(x => x.id === countryId);
                console.assert(countryEntry !== undefined);
                const centroid = countryEntry.centroid;
                //console.log("country entry:", countryEntry);
                const selectedTokens3Dselection = d3.selectAll('.topping-circle').filter(function(d){
                    for(let selectedTokenDatum of selectedTokens){
                        return d.token.id === selectedTokenDatum.token.id;
                    }
                });
                // Update model before rendering transition.
                for(let selectedTokenDatum of selectedTokens){
                    //console.log("selectedTokenDatum", selectedTokenDatum);
                    tokenService.moveToken(selectedTokenDatum.token.id, countryEntry.id);
                }
                console.log("selectedTokens3Dselection", selectedTokens3Dselection);
                transitionTokens(selectedTokens3Dselection, centroid);
                // TODO: jostakin syystä jos tässä kutsutaan updateToppingCircles, se keskeyttää transition,
                // mutta jos sitä kutsutaan muuten transition aikana, se ei keskeytä sitä. Miksi?
            }
        }
        else if(datum.isToken){
            const tokenId = datum.token.id;
            console.assert(tokenId !== undefined);
            console.log("token clicked:", tokenId);
            selectedTokens = [];
            if(!selectedTokens.find(x => datum.token.id === x.token.id)){
                selectedTokens.push(datum);
                console.log("tokenD3", targetD3.datum());
                updateToppingCircles();
            }
        }
    }
}

/*
    Pre-condition: countryId is a valid country id.
 */
function addToken(countryId){
    const countryEntry = getCountryEntryById(countryId);
    if(countryEntry === undefined){
        console.log("countryEntry is undefined");
        return;
    }
    tokenService.addToken(countryEntry.id, currentPlayer);
    console.log("all tokens:", tokenService.tokens);
    updateToppingCircles();
}

function transitionTokens(selectedTokens3Dselection, targetGeographicCoordinates){
    selectedTokens3Dselection.transition()
        .each("end", function(){
            updateToppingCircles();
        })
        .duration(2000)
        .attr("cx", function(d) {
            return projection([targetGeographicCoordinates[0], targetGeographicCoordinates[1]])[0];
        })
        .attr("cy", function(d) {
            return projection([targetGeographicCoordinates[0], targetGeographicCoordinates[1]])[1];
        });
    drawInCorrectOrder();
}

function handleNextPlayerTurn(){
    const currentPlayerIndex = players.findIndex(player => player === currentPlayer);
    console.assert(currentPlayerIndex > -1);
    if(currentPlayerIndex === players.length - 1){
        currentPlayer = players[0];
    }else{
        currentPlayer = players[currentPlayerIndex + 1];
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