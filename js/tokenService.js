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

    c.addToken = function(locationCountryId){
        const newToken = c._createToken(locationCountryId);
        c.tokens.push(newToken);
        return newToken;
    };

    c._createToken = function(countryId){
        console.assert(countryId !== undefined);
        return {
            id: c._generateUniqueId(), // string
            location: countryId
        };
    };

    c.moveToken = function(tokenId, newLocationId){
        console.assert(newLocationId !== undefined);
        const token = c.tokens.find(x => x.id === tokenId);
        console.assert(token !== undefined);
        token.location = newLocationId;
    };

    c.getTokensInCountry = function(countryId){
        // TODO
    };

    c._generateUniqueId = function(){
        const timePart = new Date().getTime().toString(36); // TODO: Miksi juuri 36?
        const randomPart = Math.random().toString(36).substring(2); // The two first chars are '0' and '.'.
        return "rid-" + timePart + "-" + randomPart;
    };

}(tokenService));