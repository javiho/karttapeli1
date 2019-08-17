"use strict";

let selectedTokenMTs = []; // MapThings which contain tokens

renderer.initializeMap(function(){
    document.addEventListener("tokenCreated", onTokenCreated);
    document.addEventListener("click", universalClickHandler);
    document.addEventListener("countryOwnerChanged", onCountryOwnerChanged);
    document.addEventListener("tokenMoved", onTokenMoved);
    document.addEventListener("tokenRemoved", onTokenRemoved);
    document.addEventListener("battleOccurred", onBattleOccurred);

    initializeKeyPressMonitoring();
    playerService.initializePlayerData();
    initializeInitialPlayerPresences();
    renderer.generateAndAddPatterns(playerService.players);
    renderer.updateTokens();
    onCountryOwnerChanged(null); // Update all country colors to set the initial colors.
});

function initializeInitialPlayerPresences(){
    const playerHomeCountries = new Map();
    //playerHomeCountries.set(playerService.players[0], [countryService.getCountryById(32)]);
    playerHomeCountries.set(playerService.players[0], [countryService.getCountryById(273)]);
    playerHomeCountries.set(playerService.players[1], [countryService.getCountryById(190)]);
    playerHomeCountries.set(playerService.players[2], [countryService.getCountryById(192)]);
    for(let [player, countries] of playerHomeCountries){
        countries.forEach(function(country){
            console.log("player:", player);
            tokenService.addToken(country, player);
        });
    }
}

//////////////////// Listeners ///////////////////

function universalClickHandler(event){
    const target = event.target;
    const targetD3 = d3.select(target);
    const datum = targetD3.datum();
    if(datum !== undefined) {
        if(datum.isCountry) {
            const countryId = datum.id;
            if(event.shiftKey){
                if(turnService.currentPhase === turnService.Phases.maneuver){
                    doMoveTokenAction(countryId);
                }else{
                    console.log("Can only move in the maneuver phase!");
                }
            }else{
                selectedTokenMTs = [];
                renderer.updateTokens();
                console.log("Nothing here yet");
            }
        }else if(datum instanceof mapThingService.MapThing){
            if(datum.modelObject instanceof tokenService.Token){
                if(aKeyPressed){
                    // TODO: jos laitetaan datumiksi objecti ja luetaan datum ja verrataan
                    // niitä === -operaattorilla, onko sama?
                    const clickedToken = datum.modelObject;
                    const isAnyTokenSelected = selectedTokenMTs.length > 0;
                    const isThisTokenSelected = selectedTokenMTs.find(
                        x => clickedToken.id === x.modelObject.id) !== undefined;
                    if(!isThisTokenSelected && isAnyTokenSelected){
                        doTokenAttackAction(datum);
                    }
                }else{
                    doSelectTokenAction(datum);
                }
            }else{
                console.assert(false, "For now, this should not happen.");
            }
        }
    }
}

// TODO: sen sijaan että lisätään ja poistetaan joka kerta erikseen mapThing, yksinkertaisempaa olisi
// olla funktio joka katsoo tokeneiden datasta, mitä muutoksia on tapahtunut, ja päivittää mapThingDataa.

function onTokenCreated(event){
    const token = event.detail.token;
    console.assert(token instanceof tokenService.Token);
    const country = token.location;
    renderer.addMapThing(token, country);
}

function onTokenRemoved(event){
    const token = event.detail.token;
    console.assert(token instanceof tokenService.Token);
    const mapThing = mapThingService.getMapThingByToken(token);
    renderer.removeMapThing(mapThing);
}

function onCountryOwnerChanged(event){
    //console.log("onCountryOwnerChanged called:", event);
    renderer.updateCountryColors();
}

function onTokenMoved(event){
    //console.log("tokenMoved called:", event);
    const token = event.detail.token;
    const originalLocation = event.detail.originalLocation;
    const newLocation = event.detail.newLocation;
    console.assert(originalLocation instanceof countryService.Country
        && newLocation instanceof countryService.Country
        && token instanceof tokenService.Token);
    const originalGeoCountry = renderer.countryData.find(x => x.country === originalLocation);
    const newGeoCountry = renderer.countryData.find(x => x.country === newLocation);
    const mapThing = mapThingService.mapThings.find(x => x.modelObject === token);
    renderer.moveThingFromCountryToAnother(mapThing, originalGeoCountry, newGeoCountry);
    renderer.updateTokens();
}

function onBattleOccurred(event){
    // TODO animointi pitäisi laittaa renderöijälle.
    console.log("Battle occurred!");
    const d = event.detail;
    console.assert(d.attacker !== undefined && d.defender !== undefined && d.dead !== undefined,
        d.attacker, d.defender, d.dead);
    // TODO onko muka data-attribuutteja?
    const attackerSelection = renderer.g.select(".token[data-token-id=" + d.attacker.id + "]");
    const defenderSelection = renderer.g.select(".token[data-token-id=" + d.defender.id + "]");
    const attackerDatum = attackerSelection.datum();
    const defenderDatum = defenderSelection.datum();
    console.assert(attackerDatum instanceof mapThingService.MapThing);
    console.assert(defenderDatum instanceof mapThingService.MapThing);
    if(d.dead === d.attacker){
        console.log("Attacker will die");
        renderer.animateBattleLine(attackerDatum, defenderDatum);
        tokenService.removeToken(attackerSelection.datum().modelObject);
        renderer.updateTokens();
        //updateTokenStackNumbers();
        // Animate also defender counter-attack.
        // TODO: transitiot voi laittaa d3:lla jonoon jotenkin.
        /*animateTokenAttack(attackerSelection, function(selection1){
            animateTokenDeath(selection1, function(selection2){
                tokenService.removeToken(selection2.datum().token);
                //console.log("token removed!");
                updateToppingCircles();
                updateTokenStackNumbers(); // TODO otettava käyttöön myöhemmin?
            });
        });*/
        //animateTokenAttack(defenderSelection);
    }else if(d.dead === d.defender){
        console.log("Defender will die");
        renderer.animateBattleLine(attackerDatum, defenderDatum);
        tokenService.removeToken(defenderSelection.datum().modelObject);
        renderer.updateTokens();
        //console.log("defender token removed!");
        // updateTokenStackNumbers(); // TODO otettava käyttöön myöhemmin?
    }else{
        // No one died
        renderer.animateBattleLine(attackerDatum, defenderDatum);
        renderer.updateTokens();
    }
}

///////////////////// Actions //////////////////////

function doSelectTokenAction(datum){
    selectedTokenMTs = [];
    selectedTokenMTs.push(datum);
    renderer.updateTokens();
}

function doMoveTokenAction(countryId){
    console.assert(selectedTokenMTs.every(x => x.modelObject instanceof tokenService.Token));
    const geoCountry = geoCountryService.getGeoCountryById(countryId);
    console.assert(geoCountry !== undefined);
    /* Liikkumisen animointia varten
    const selectedTokens3Dselection = d3.selectAll('.token').filter(function(d){
        const token = d.modelObject;
        for(let selectedTokenMT of selectedTokenMTs){
            if(token.id === selectedTokenMT.modelObject.id){
                return true;
            }
        }
        return false;
    });*/
    for (let selectedTokenMT of selectedTokenMTs) {
        const selectedToken = selectedTokenMT.modelObject;
        if(tokenService.canMoveToken(selectedToken.id, geoCountry.country)) {
            tokenService.moveToken(selectedToken.id, geoCountry.country);
            //transitionTokens(selectedTokens3Dselection, centroid); TODO liikkumisen animointi
        }else{
            alert("Can only move to neighboring areas.");
        }
    }
}

function doTokenAttackAction(mapThing){
    console.assert(mapThing instanceof mapThingService.MapThing);
    const attacker = selectedTokenMTs[0].modelObject;
    const defender = mapThing.modelObject;
    console.assert(attacker !== undefined && defender !== undefined);
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