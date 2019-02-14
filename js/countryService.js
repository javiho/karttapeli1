"use strict";

const countryService = {};
(function(c) {
    // c stands for context.

    c.countries = null;

    /*
        Pre-condition: country is Country.
        Returns the Player who should now be the owner of country.
     */
    c.resolveOwner = function(country){
        console.assert(country instanceof c.Country);
        /*
        kaikki omistajat alueella
        alueen nykyinen omistaja
        jos nykyisellä omistajalla ei ole tokeneita
            ota se alueella olevista pelaajista joilla on eniten tokeneita alueella
                jos tasapeli, käytetään pelaaja järjestystä
         */
        const currentOwner = country.owner; // Player
        console.assert(currentOwner instanceof playerService.Player || currentOwner === null);
        const playersToTokenAmounts = c.getOwnerTokenAmountsInCountry(country);
        // If owner is null, the condition is: undefined > 0, which is false.
        if (playersToTokenAmounts.get(currentOwner) > 0) {
            return currentOwner;
        }
        else{
            let areThereTokensInCountry = false;
            for(let value of playersToTokenAmounts.values()){
                if(value > 0){
                    areThereTokensInCountry = true;
                    break;
                }
            }
            if(!areThereTokensInCountry) {
                return null; // No tokens in the country, so owner is null.
            }else{
                const playersWithMostTokens = findKeysWithExtremeValue(playersToTokenAmounts, "max");
                if(playersWithMostTokens.length === 1){
                    return playersWithMostTokens[0];
                }else{
                    const firstPlayerInOrder = playerService.getFirstInOrder();
                    console.assert(firstPlayerInOrder !== undefined);
                    return firstPlayerInOrder;
                }
            }
        }
    };

    c.updateOwner = function(country){
        const appropriateOwner = c.resolveOwner(country);
        country.owner = appropriateOwner;
        console.log("Owner of country:", country, "set to: ", appropriateOwner);

        const countryOwnerChanged = new CustomEvent("countryOwnerChanged", {
            detail: {
                newOwner: appropriateOwner
            }
        });
        document.dispatchEvent(countryOwnerChanged);
    };

    /*
    Returns an array of Player objects.
    TODO mihin tätä tarvitaan?
     */
    c.getOwnersPresentInCountry = function(country){
        const tokensInCountry = tokenService.getTokensInCountry(country.id);
        const ownersPresent = [];
        tokensInCountry.forEach(function(token){
            const owner = token.owner;
            console.assert(owner instanceof playerService.Player);
            if(!(ownersPresent.includes(owner))){
                ownersPresent.push(owner);
            }
        });
        return ownersPresent;
    };

    /*
    Return value: a Map where keys are Players and values are their token amounts in the country.
     */
    c.getOwnerTokenAmountsInCountry = function(country){
        const tokensInCountry = tokenService.getTokensInCountry(country.id);
        const map = new Map();
        tokensInCountry.forEach(function(token){
            const owner = token.owner;
            console.assert(owner instanceof playerService.Player);
            if(!map.has(owner)){
                map.set(owner, 1);
            }else{
                const amount = map.get(owner);
                map.set(owner, amount + 1);
            }
        });
        return map;
    };

    c.getCountryById = function(countryId){
        const country = c.countries.find(element => element.id === countryId);
        console.assert(country !== undefined, "countryId:", countryId);
        return country;
    };

    c.Country = function(id, name){
        this.id = id; // int
        this.name = name; // string
        this.owner = null; // Player object
        // at least neighbors will be here, or maybe elsewhere
    }

})(countryService);