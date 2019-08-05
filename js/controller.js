"use strict";

let selectedTokenMTs = []; // MapThings which contain tokens

renderer.initializeMap(function(){
    document.addEventListener("tokenCreated", onTokenCreated);
    document.addEventListener("click", universalClickHandler);
    document.addEventListener("countryOwnerChanged", onCountryOwnerChanged);

    playerService.initializePlayerData();
    initializeInitialPlayerPresences();
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
            if(false){
                ;
            }else{
                selectedTokenMTs = [];
                renderer.updateTokens();
                console.log("Nothing here yet");
            }
        }else if(datum instanceof mapThingService.MapThing){
            if(datum.modelObject instanceof tokenService.Token){
                // TODO: jos laitetaan datumiksi objecti ja luetaan datum ja verrataan
                // niitä === -operaattorilla, onko sama?
                const clickedToken = datum.modelObject;
                const isAnyTokenSelected = selectedTokenMTs.length > 0;
                const isThisTokenSelected = selectedTokenMTs.find(
                    x => clickedToken.id === x.modelObject.id) !== undefined;
                doSelectTokenAction(datum);
            }else{
                console.assert(false, "For now, this should not happen.");
            }
        }
    }
}

function onTokenCreated(event){
    const token = event.detail.token;
    console.assert(token instanceof tokenService.Token);
    const country = token.location;
    renderer.addMapThing(token, country);
}

function onCountryOwnerChanged(event){
    console.log("onCountryOwnerChanged called:", event);
    renderer.updateCountryColors();
}

///////////////////// Actions //////////////////////

function doSelectTokenAction(datum){
    selectedTokenMTs = [];
    selectedTokenMTs.push(datum);
    renderer.updateTokens();
}