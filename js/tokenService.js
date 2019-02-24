"use strict";

// This object contains functions for life and the abstraction of it's presentation in the view, if you catch my meaning.
const tokenService = {};
(function(c){
    // c stands for context.

    c.tokens = [];
    //c.countryIdToTokenIds = null;

    c.initialize = function(){
        /*c.countryIdToTokenIds = new Map();
        countryIds.forEach(function(element){
            c.countryIdToTokenIds.set(element, []);
        });*/
    };

    c.addToken = function(locationCountryId, playerId){
        const newToken = c._createToken(locationCountryId, playerId);
        c.tokens.push(newToken);
        countryService.updateOwner(countryService.getCountryById(locationCountryId));
        return newToken;
    };

    /*
        Pre-condition: player is a player object.
     */
    c._createToken = function(countryId, player){
        console.assert(countryId !== undefined);
        console.assert(player !== undefined);
        console.assert(player.name !== undefined);
        console.assert(player.id !== undefined);
        console.assert(player.color !== undefined);
        return {
            id: c._generateUniqueId(), // string
            location: countryId,
            owner: player,
            hasStrength: true,
            isDead: false
        };
    };

    // TODO: eikö voisi ottaa token-objectin eikä id:tä?
    c.moveToken = function(tokenId, newLocationId){
        console.assert(newLocationId !== undefined);
        const token = c.tokens.find(x => x.id === tokenId);
        console.assert(token !== undefined);
        const currentLocationId = token.location;
        console.assert(currentLocationId !== undefined);
        token.location = newLocationId;
        countryService.updateOwner(countryService.getCountryById(currentLocationId));
        countryService.updateOwner(countryService.getCountryById(newLocationId));
        /* TODO mihin tätä tarvitaan?
        const moveTokenEvent = new CustomEvent("moveToken", {
            detail: {
                fromCountryId: currentLocationId,
                toCountryId: newLocationId
            }
        });
        document.dispatchEvent(moveTokenEvent);*/
    };

    /*
        Returns an object which describes the result of the battle.
     */
    c.resolveBattle = function(attacker, defender){
        const random = Math.random();
        const result = {attacker: attacker, defender: defender};
        if(random < 1){ // TODO: 0.5
            // Attacker succeeded
            result.winner = attacker;
            result.loser = defender;
            if(attacker.hasStrength){
                result.dead = defender;
            }else{
                // Attacker can't attack if he doesn't have strength though.
                result.dead = null;
            }
        }else{
            // Defender succeeded
            result.winner = defender;
            result.loser = attacker;
            if(defender.hasStrength){
                result.dead = attacker;
            }else{
                result.dead = null;
            }
        }
        console.log("Marked for death:", result.dead);
        return result;
    };

    /*
        Pre-condition: battleResult is what c.resolveBattle returns.
     */
    c.executeBattle = function(battleResult){
        battleResult.winner.hasStrength = false;
        battleResult.loser.hasStrength = false;
        if(battleResult.dead !== null) {
            const deadToken = battleResult.dead;
            deadToken.isDead = true;
        }
        const battleOccurredEvent = new CustomEvent("battleOccurred", {
            detail: {
                dead: battleResult.dead,
                attacker: battleResult.attacker,
                defender: battleResult.defender,
                winner: battleResult.winner,
                loser: battleResult.loser
            }
        });
        document.dispatchEvent(battleOccurredEvent);
    };

    /*
        Removes token from existence. This is different than killing a token.
     */
    c.removeToken = function(token){
        console.assert(token !== undefined);
        console.log("tokenService.removeToken:", token);
        const oldTokensCount = c.tokens.length;
        console.log("tokens before removal:", c.tokens);
        c.tokens = removeFromArray(c.tokens, token);
        console.assert(c.tokens.length < oldTokensCount);
        console.log("tokens after removal:", c.tokens);
        countryService.updateOwner(countryService.getCountryById(token.location));
        dispatchCustomEvent("tokenRemoved", {token: token});
    };

    /*
    Pre-condition: countryId is a number.
     */
    c.getTokensInCountry = function(countryId){
        console.assert(typeof countryId === "number");
        if(typeof countryId !== "number"){
            console.log("getTokensInCountry.countryId's type is: ", typeof countryId);
        }
        return c.tokens.filter(token => token.location === countryId);
    };

    c._generateUniqueId = function(){
        const timePart = new Date().getTime().toString(36); // TODO: Miksi juuri 36?
        const randomPart = Math.random().toString(36).substring(2); // The two first chars are '0' and '.'.
        return "rid-" + timePart + "-" + randomPart;
    };

}(tokenService));