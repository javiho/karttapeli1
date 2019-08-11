"use strict";

const tokenService = {};
(function(c){
    // c stands for context.

    c.tokens = [];
    c.tokenPrice = 2;
    //c.countryIdToTokenIds = null;

    c.initialize = function(){
        /*c.countryIdToTokenIds = new Map();
        countryIds.forEach(function(element){
            c.countryIdToTokenIds.set(element, []);
        });*/
    };

    c.addToken = function(locationCountry, player){
        console.assert(player instanceof playerService.Player
            && locationCountry instanceof countryService.Country);
        const newToken = new c.Token(locationCountry, player);
        c.tokens.push(newToken);
        countryService.updateOwner(locationCountry);
        dispatchCustomEvent("tokenCreated", {token: newToken});
        return newToken;
    };

    /*
        Pre-condition: player is a player object.
     */
    /*c._createToken = function(countryId, player){
        console.assert(countryId !== undefined);
        console.assert(player !== undefined);
        console.assert(player.name !== undefined);
        console.assert(player.id !== undefined);
        console.assert(player.color !== undefined);
        return {
            id: generateUniqueId(), // string
            location: countryId,
            owner: player,
            hasStrength: true,
            isDead: false
        };
    };*/

    c.canMoveToken = function(tokenId, newLocation){
        // TODO kesken
        console.assert(newLocation instanceof countryService.Country);
        const token = c.tokens.find(x => x.id === tokenId);
        console.assert(token !== undefined);
        const currentLocation = token.location;
        console.assert(currentLocation !== undefined);
        return countryService.areNeighbors(currentLocation, newLocation);
    };

    // TODO: eikö voisi ottaa token-objectin eikä id:tä?
    c.moveToken = function(tokenId, newLocation){
        console.assert(newLocation instanceof countryService.Country);
        const token = c.tokens.find(x => x.id === tokenId);
        console.assert(token !== undefined && token !== null);
        const currentLocation = token.location;
        console.assert(currentLocation instanceof countryService.Country);
        token.location = newLocation;
        countryService.updateOwner(currentLocation);
        countryService.updateOwner(newLocation);
        dispatchCustomEvent("tokenMoved", {
            token: token,
            originalLocation: currentLocation,
            newLocation: newLocation
        });
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
        if(random < 0.5){
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

    c.returnStrengthToTokens = function(){
        c.tokens.forEach(token => token.hasStrength = true);
        console.assert(c.tokens.every(token => token.hasStrength)); //TODO: poista
    };

    /*
    Pre-condition: countryId is a number.
     */
    c.getTokensInCountry = function(country){
        //console.assert(typeof countryId === "number");
        console.assert(country instanceof countryService.Country, country);
        //if(typeof countryId !== "number"){
        //    console.log("getTokensInCountry.countryId's type is: ", typeof countryId);
        //}
        return c.tokens.filter(token => token.location === country);
    };

    // TODO: pitäisi olla joku constructori että voisi käyttää instanceof ja tämä olisi turha.
    // Ellei ole jo mahdollista tehdä niin.
    c.isToken = function(possibleToken){
        const requiredAttributes = ["id", "owner", "location", "hasStrength"];
        const isToken = requiredAttributes.every(function(attribute){
            return possibleToken.hasOwnProperty(attribute);
        });
        return isToken;
    };

    /*
        Pre-condition: player is a player object. country is a Country.
     */
    c.Token = function(country, player){
        console.assert(country instanceof countryService.Country);
        console.assert(player instanceof playerService.Player);
        this.id = generateUniqueId(); // string
        this.location = country; // Country
        this.owner = player; // Player
        this.hasStrength = true;
        this.isDead = false;
    };

})(tokenService);