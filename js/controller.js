"use strict";

renderer.initializeMap(function(){
    document.addEventListener("tokenCreated", onTokenCreated);

    playerService.initializePlayerData();
    initializeInitialPlayerPresences();
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

function onTokenCreated(event){
    const token = event.detail.token;
    console.assert(token instanceof tokenService.Token);
    const country = token.location;
    renderer.addMapThing(token, country);
}