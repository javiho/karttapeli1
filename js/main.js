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
svg.append("defs");
/*svg.append("defs").append("pattern")
    .attr("id", "star")
    .attr("viewBox", "0,0,10,10")
    .attr("width", "100%")
    .attr("height", "100%");
d3.select("#star").append("polygon")
    .attr("points", "0,0 10,0 10,10 0,10").attr("fill", "blue");
d3.select("#star").append("polygon")
    .attr("points", "0,0 2,5 0,10 5,8 10,10 8,5 10,0 5,2");*/
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
const ownerlessCountryFill = "#000000";
const maxZoomScale = 50;
let zoomScale = 1;
let tokenStacksByOwner = false;
let defaultTokenDistanceFromCentroid = 10; //10; // Distance from centroid to token circle's center.
const tokenStates = {
    default: "defaultState",
    dead: "dead",
    noStrength: "noStrength"
};

// load and display the World
d3.json("world-110m.json", function(error, topology) {

    console.log("topology geometries:", topology.objects.countries.geometries);
    const neighborsArrays = topojson.neighbors(topology.objects.countries.geometries);
    console.log("neighbors array:", neighborsArrays);
    const pathDataArray = topojson.feature(topology, topology.objects.countries).features
        // add other stuff to the data in addition to topjson features
        .map(function(element){
            if(element.id === -99){
                console.log("pathDataArray: was -99");
                // Do nothing.
            }else{
                element.isCountry = true;
            }
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
        turnService.initializeTurnData();
        updateCurrentPlayerInfo();
        initializeCountryData(pathDataArray, neighborsArrays);
        updateCentroidCircles();
        updateToppingCircles();
        updateCountryColors(null); // Update all country colors to set the initial colors.
        initializeDocument();
    });
});

// zoom and pan
var zoom = d3.behavior.zoom()
    .on("zoom",function() {
        const newScale = d3.event.scale;
        zoomScale = newScale;
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
    document.addEventListener("countryOwnerChanged", updateCountryColors);
    document.addEventListener("battleOccurred", performBattle);
    document.addEventListener("tokenRemoved", onTokenRemoved);
    document.addEventListener("turnChanged", onTurnChanged);
    document.addEventListener("phaseChanged", onPhaseChanged);
    document.addEventListener("currentPlayerChanged", onCurrentPlayerChanged);
    initializeKeyPressMonitoring();
    generateAndAddPatterns(playerService.players)
    /* TODO: jos halutaan tunnistaa muiden kuin shift ym. helposti tunnistettavia näppäimien pohjassapito.
    document.addEventListener("keyup", function(event){
        console.log("key up:", event.key);
    });
    document.addEventListener("keydown", function(event){
        console.log("key down:", event.key, event.key === "a");
    });*/
}

/*
    Pre-condition: players is an array of Player objects.
 */
function generateAndAddPatterns(players){
    const statesToPolygonPoints = new Map();
    statesToPolygonPoints.set(tokenStates.noStrength, "2,2 8,2 8,8 2,8");
    statesToPolygonPoints.set(tokenStates.dead, "0,0 2,5 0,10 5,8 10,10 8,5 10,0 5,2");
    statesToPolygonPoints.set(tokenStates.default, "");
    const backgroundPolygonPoints = "0,0 10,0 10,10 0,10";
    const defs = svg.select("defs");
    players.forEach(function(player){
        for(let [state, statePolygonPoints] of statesToPolygonPoints.entries()){
            const patternId = getTokenPatternId(player, state);
            const pattern = defs.append("pattern")
                .attr("id", patternId)
                .attr("viewBox", "0,0,10,10")
                .attr("width", "100%")
                .attr("height", "100%");
            pattern.append("polygon")
                .attr("points", backgroundPolygonPoints).attr("fill", player.color);
            pattern.append("polygon")
                .attr("points", statePolygonPoints);
        }
    });
}

/*
    player: Player, state: string
 */
function getTokenPatternId(player, state){
    return player.id + "-" + state;
}


/*************************** Data for rendering ******************************/

function initializeCountryData(topology, neighborsArrays){
    centroidData = dataForRendering.initializeCentroidData(topology);
    countryData = dataForRendering.initializeCountryData(
        topology, centroidData, countryNames, neighborsArrays, path);
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
    //console.log("updateToppingCircles: selection.size", selection.size());
    selection.enter()
        .append("circle")
        .attr("class", "topping-circle")
        .attr("r", 10)
        .attr("stroke-width", 2); // Not visible if stroke attribute is empty.
        //.attr("stroke-dasharray", "5,5"); // Not visible if stroke attribute is empty.
    selection
        .attr("data-token-id", function(d){
            return d.token.id; // TODO: on tarkoitus olla yksi entry ja eri jokaisella
        })
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
                return "black"; // No stroke.
            }else{
                return "red";
            }
        })
        .attr("stroke-dasharray", function(d){
            const contains = selectedTokens.find(function(element){
                return element.token.id === d.token.id;
            });
            if(!contains){
                //console.log("wasn't found in selected elements");
                return ""; // No stroke.
            }else{
                return "5,5";
            }
        })
        .style("fill", function(d){
            // TODO: pitää repäistä tila jostakin
            return "url(#"+getTokenPatternId(d.token.owner, dataForRendering.getTokenState(d))+")";
            //return "url(#star)";//d.token.owner.color;
        });
    selection.exit().remove();

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
    $('#current-player-info').text(turnService.currentPlayer.name);
}

function updateCountryColors(event){
    g.selectAll("path")
        .attr("fill", function(d){
            if(d.isCountry){
                const countryId = d.id;
                const countryModelObject = countryService.getCountryById(countryId);
                console.assert(countryId !== undefined);
                console.assert(countryModelObject.owner !== undefined);
                let newColor = null;
                if(countryModelObject.owner == null){
                    newColor = ownerlessCountryFill;
                }else{
                    newColor = countryModelObject.owner.color;
                }
                return newColor;
            }
            // return undefined
        });
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
    const tokenTranslation = calculateTokenTranslation(
        calculateZoomDependentDistanceFromCentroid(zoomScale, countryPresentation), slotAmount, slotIndex);
    return tokenTranslation;
}

/*
    Same as getTokenTranslationFromOwnerAndCountry, except tokens are not stacked.
 */
function getSpreadTokenTranslationByOwnerAndCountry(countryPresentation, token){
    const tokensPresent = tokenService.getTokensInCountry(countryPresentation.country.id);
    const slotAmount = tokensPresent.length;
    const slotIndex = getSpreadTokenSlotIndex(tokensPresent, token);
    const tokenTranslation = calculateTokenTranslation(
        calculateZoomDependentDistanceFromCentroid(zoomScale, countryPresentation), slotAmount, slotIndex);
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

function calculateZoomDependentDistanceFromCentroid(zoomScale, countryPresentation){
    /*
    Olisi jokaisella maalla arvo että kuinka paljon vaatii zoomaamista.
    Kun zoomataan lähemmäs, distanssi sentroidista kasvaa vaikka:
    defaultDistance * zoomScale * countryBigness
     */
    const countryBigness = dataForRendering.getCountryBigness(countryPresentation);
    // TODO: taikanumero talteen?
    // TODO: kun zoomataan todella lähelle, voisi kasvaa lineaarisesti tai exponentiaalisesti.
    return defaultTokenDistanceFromCentroid * Math.pow(zoomScale,0.8) * countryBigness;
}

/**************************** Update functions ends *************************************/



/**************************** User actions *************************************/

function universalClickHandler(event){
    buttonClickHandler(event);
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
                    if(tokenService.canMoveToken(selectedTokenDatum.token.id, countryEntry.country.id)) {
                        tokenService.moveToken(selectedTokenDatum.token.id, countryEntry.country.id);
                        transitionTokens(selectedTokens3Dselection, centroid);
                        // TODO: jostakin syystä jos tässä kutsutaan updateToppingCircles, se keskeyttää transition,
                        // mutta jos sitä kutsutaan muuten transition aikana, se ei keskeytä sitä. Miksi?
                    }else{
                        alert("Can only move to neighboring areas.");
                    }
                }
                //console.log("selectedTokens3Dselection", selectedTokens3Dselection);
            }else{
                selectedTokens = [];
                updateToppingCircles();
                console.log("Nothing here yet");
            }
        }
        else if(datum.isToken) {
            console.assert(datum.token !== undefined && datum.countryPresentation !== undefined);
            const tokenId = datum.token.id;
            console.assert(tokenId !== undefined);
            //console.log("token clicked:", tokenId);
            const isAnyTokenSelected = selectedTokens.length > 0;
            const isThisTokenSelected = selectedTokens.find(x => datum.token.id === x.token.id) !== undefined;
            if(aKeyPressed){
                if(!isThisTokenSelected && isAnyTokenSelected){
                    const attacker = selectedTokens[0].token;
                    const defender = datum.token;
                    if(attacker.hasStrength === false){
                        console.log("No strength to attack");
                    }else if(attacker.owner === defender.owner){
                        console.log("Both tokens belong to same player. No battle.");
                    }else{
                        const battleResult = tokenService.resolveBattle(attacker, defender);
                        //console.log("battle result:", battleResult);
                        // TODO: joko tässä tai muualla toteutettava lopputuloksen vaatimat asiat
                        tokenService.executeBattle(battleResult);
                    }
                }
            }else {
                selectedTokens = [];
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

function buttonClickHandler(event){
    if(event.target.id === "next-player-button"){
        turnService.advanceToNextPlayer();
    }else if(event.target.id === "next-phase-button"){
        turnService.advanceToNextPhase();
    }else if(event.target.id === "next-region-button"){
        console.log("Nothing here yet");
    }
}

function performBattle(event){
    //console.log("performBattle called");
    const d = event.detail;
    console.assert(d.attacker !== undefined && d.defender !== undefined && d.dead !== undefined,
        d.attacker, d.defender, d.dead);
    /*
    Ota hyökkääjä ja puolustaja
    animoi hyökkääjä
    animoi puolustaja
    selvitä, kumpi kuoli jos kumpikaan
    animoi kuolema, jos se tapahtui
     */
    const attackerSelection = g.select(".topping-circle[data-token-id=" + d.attacker.id + "]");
    const defenderSelection = g.select(".topping-circle[data-token-id=" + d.defender.id + "]");
    if(d.dead === d.attacker){
        console.log("Attacker will die");
        // Animate also defender counter-attack.
        // TODO: transitiot voi laittaa d3:lla jonoon jotenkin.
        animateTokenAttack(attackerSelection, function(selection1){
            animateTokenDeath(selection1, function(selection2){
                tokenService.removeToken(selection2.datum().token);
                //console.log("token removed!");
                updateToppingCircles();
                updateTokenStackNumbers();
            });
        });
        animateTokenAttack(defenderSelection);
    }else if(d.dead === d.defender){
        console.log("Defender will die");
        //console.log("Defender owner:", defenderSelection.datum().token.owner.color);
        animateTokenAttack(attackerSelection);
        animateTokenDeath(defenderSelection, function(selection1) {
            //console.log("Defender death after animation function: selection1.datum().token.owner.color",
            //    selection1.datum().token.owner.color);
            tokenService.removeToken(selection1.datum().token);
            //console.log("defender token removed!");
            updateToppingCircles();
            updateTokenStackNumbers();
        });
    }else{
        // No one died
        animateTokenAttack(attackerSelection);
        updateToppingCircles();
    }

}

function animateTokenAttack(tokenSelection, afterAnimationFunction){
    const normalRadius = parseInt(tokenSelection.attr("r"));
    tokenSelection.transition()
    // https://github.com/d3/d3-3.x-api-reference/blob/master/Transitions.md#each
        .each("end", function(){
            //updateToppingCircles();
            //console.log("battle attack transition ended");
            tokenSelection.attr("r", ""+normalRadius);
            if(afterAnimationFunction !== undefined){
                afterAnimationFunction(tokenSelection);
            }
        })
        .duration(1000)
        .attr("r", function(d) {
            //console.log(normalRadius);
            return normalRadius * 2;
        });
}

function animateTokenDeath(tokenSelection, afterAnimationFunction){
    const normalRadius = parseInt(tokenSelection.attr("r"));
    // TODO: Tässä tokenin datum näyttäisi olevan eri kuin alempana kohdassa 2.
    //console.log("animateTokenDeath: tokenSelection.datum().token.owner.color",
    //    tokenSelection.datum().token.id);
    tokenSelection.transition()
    // https://github.com/d3/d3-3.x-api-reference/blob/master/Transitions.md#each
        .each("end", function(){
            //updateToppingCircles();
            //console.log("token death transition ended");
            tokenSelection.attr("r", ""+normalRadius);
            if(afterAnimationFunction !== undefined){
                // TODO: 2.
                //console.log("animateTokenDeath afterAnimationFunction tokenSelection owner:",
                //    tokenSelection.datum().token.id);
                afterAnimationFunction(tokenSelection);
            }
        })
        .duration(1000)
        .attr("r", function(d) {
            //console.log(normalRadius);
            return normalRadius * (1/3);
        });
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
    tokenService.addToken(countryEntry.country.id, turnService.currentPlayer);
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
/*
function handleNextPlayerTurn(){
    const currentPlayerIndex = playerService.players.findIndex(player => player === playerService.currentPlayer);
    console.assert(currentPlayerIndex > -1);
    if(currentPlayerIndex === playerService.players.length - 1){
        playerService.currentPlayer = playerService.players[0];
    }else{
        playerService.currentPlayer = playerService.players[currentPlayerIndex + 1];
    }
    updateCurrentPlayerInfo();
}*/

function onTokenRemoved(){
    //console.log("onTokenRemoved");
    updateToppingCircles();
    updateTokenStackNumbers();
}

function onTurnChanged(){
    $('#current-turn-info').text(""+turnService.currentTurn);
}

function onPhaseChanged(){
    $('#current-phase-info').text(turnService.currentPhase);
}

function onCurrentPlayerChanged(){
    $('#current-player-info').text(turnService.currentPlayer.name);
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