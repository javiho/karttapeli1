"use strict";

// This object contains functions for life and the abstraction of it's presentation in the view, if you catch my meaning.
const dataForRendering = {};
(function(c) {
    // c stands for context.

    c.initializeCentroidData = function(topology){
        const centroidData = topology
            .map(function(element){
                // return path.centroid(element); // "computes the projected centroid on the Cartesian plane"
                console.assert(d3.geo.centroid(element) !== undefined);
                return d3.geo.centroid(element); // "Returns the spherical centroid"
            });
        return centroidData;
    };

    /*
    TODO: vanha kuvaus:
    Returns a list of objects like this: {name: string, centroid: [number, number], id: number}
    TODO: uusi:
    Returns a list of objects like this: {country: Country, centroid: [number, number]
     */
    c.initializeCountryData = function(topology, centroidData, countryNames){
        const countryModelObjects = []; // Array of Country objects.
        const centroids = []; // Array[Array[int, int]]
        // 252 maan nimeä, mutta 177 topologiahommelia!
        for(let i = 0; i < topology.length; i++) {
            // topology was in same order and of same length as centroid data.
            const featureEntry = topology[i];
            const centroid = centroidData[i];
            const featureIdNumber = parseInt(featureEntry.id);
            // Some features in the json area -99 and those are not countries.
            if (featureIdNumber === -99) {
                console.log("was -99");
                continue;
            }
            const countryName = dataForRendering.getCountryNameById(featureIdNumber, countryNames);
            const newCountryModelObject = new countryService.Country(featureIdNumber, countryName);
            countryModelObjects.push(newCountryModelObject);
            centroids.push(centroid);
        }
        console.assert(countryModelObjects.length === centroids.length);
        const countryData = [];
        for(let i = 0; i < countryModelObjects.length; i++){
            const newCountryEntry = {};
            newCountryEntry.country = countryModelObjects[i];
            newCountryEntry.centroid = centroids[i];
            countryData.push(newCountryEntry);
        }
        console.log("countryData:", countryData);
        return countryData;
    };

    /*
        Returns new token data array.
     */
    c.updateTokenData = function(countryData){
        let newTokenData = [];
        tokenService.tokens.forEach(function(element){
            const tokenModel = element;
            const countryId = element.location;
            const countryPresentation = dataForRendering.getCountryEntryById(countryId, countryData);
            console.assert(countryPresentation !== undefined);
            const newTokenPresentation = {
                token: tokenModel,
                countryPresentation: countryPresentation,
                isToken: true
            };
            newTokenData.push(newTokenPresentation);
        });
        return newTokenData;
    };

    c.getTextElementData = function(countryData){
        const textElementData = [];
        countryData.forEach(function(countryPresentation){
            const tokensInCountry = tokenService.getTokensInCountry(countryPresentation.country.id);
            const ownersPresent = dataForRendering.getOwnersPresentInCountry(countryPresentation);
            if(tokensInCountry.length > 0){
                const ownersAndTokenAmounts = dataForRendering.getOwnerTokenAmountsInCountry(countryPresentation); // Map
                ownersPresent.forEach(function(owner){
                    const newTextElementEntry = {
                        countryPresentation: countryPresentation,
                        lon: countryPresentation.centroid[0],
                        lat: countryPresentation.centroid[1],
                        amountOfTokens: ownersAndTokenAmounts.get(owner),
                        owner: owner, // The owner of those tokens of which amount this text element displays.
                        isLabel: true
                    };
                    textElementData.push(newTextElementEntry);
                });
            }
        });
        return textElementData;
    };

    /*
    Returns an array of Player objects.
     */
    c.getOwnersPresentInCountry = function(countryPresentation){
        const tokensInCountry = tokenService.getTokensInCountry(countryPresentation.country.id);
        const ownersPresent = [];
        tokensInCountry.forEach(function(token){
            const owner = token.owner;
            if(!(ownersPresent.includes(owner))){
                ownersPresent.push(owner);
            }
        });
        return ownersPresent;
    };

    /*
    Return value: a Map where keys are Players and values are their token amounts in the country.
     */
    c.getOwnerTokenAmountsInCountry = function(countryPresentation){
        const tokensInCountry = tokenService.getTokensInCountry(countryPresentation.country.id);
        const map = new Map();
        tokensInCountry.forEach(function(token){
            const owner = token.owner;
            if(!map.has(owner)){
                map.set(owner, 1);
            }else{
                const amount = map.get(owner);
                map.set(owner, amount + 1);
            }
        });
        return map;
    };

    /*
    Gets country entry from countryData by country id, or undefined if it doesn't exist.
     */
    c.getCountryEntryById = function(countryId, countryData){
        const countryEntry = countryData.find(function(element){
            return element.country.id === countryId;
        });
        return countryEntry;
    };

    /*
    Pre-condition: there is a country name for idString in countryNames.
     */
    c.getCountryNameById = function(idNumber, countryNames){
        const countryEntry = countryNames.find( entry => parseInt(entry.id) === idNumber );
        if(countryEntry === undefined){
            console.log("getCountryNameById: idNumber:", idNumber);
        }
        const name = countryEntry.name;
        console.assert(name !== undefined);
        return name;
    };

})(dataForRendering);