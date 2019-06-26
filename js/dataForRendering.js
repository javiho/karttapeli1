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

    Pre-condition: element of neighborsArrays has array(s???) of the indices of the neighbors of that
    elements, where those indices are the indices of neighborsArrays
    (https://github.com/topojson/topojson-client/blob/master/README.md#neighbors)
     */
    c.initializeCountryData = function(topology, centroidData, neighborsArrays, path){
        /*
        Käydään läpi neighborsArrays
            - etsitään countryModelObjectsista vastaava elementti kuin neighborsArrays[i]
                - se olkoon c
                - nyt on lista naapuri-indeksit indekseja jotka viittaavat neighborsArrayhin
                - käydään läpi se lista
                    - etsitään countryModelObjectsista vastaava elementti kuin naapuri-indeksit[i]
                    - lisätään ne c:n naapuriksi

        Tehdään taulukko, jonka koko on neighborsArrays.length ja jonka elementit ovat indeksejä
        countryModelObjects-tauluun (tai null)
         */
        // E.g. [0, null, 1] if neighborsArray == [a, b, c] and countryModelObjects == [a', c']
        // To get element from countryModelObjects corresponding to neighborsArray[i], you access
        // countryModelObjects[countryModelObjectsIndicesOfNeighborsArrayElements[i]]
        const countryModelObjectsOfNeighborsArraysIndices = []; // TODO parempi nimi?

        const countryModelObjects = []; // Array of Country objects.
        const centroids = []; // Array[Array[int, int]]
        const areas = []; // Array of numbers.
        let countryModelObjectsIndexCounter = 0;
        // 252 maan nimeä, mutta 177 topologiahommelia!
        for(let i = 0; i < topology.length; i++) {
            // topology was in same order and of same length as centroid data.
            const featureEntry = topology[i];
            const centroid = centroidData[i];
            const featureIdNumber = parseInt(featureEntry.id);
            // Some features in the json area -99 and those are not countries.
            if (featureIdNumber === -99) {
                console.log("was -99");
                countryModelObjectsOfNeighborsArraysIndices.push(null);
                continue;
            }
            //const countryName = dataForRendering.getCountryNameById(featureIdNumber, countryNames);
            //                         |
            //                         v
            const countryName = featureEntry.name;
            console.assert(countryName !== undefined);
            const countryArea = path.area(featureEntry);
            const newCountryModelObject = new countryService.Country(featureIdNumber, countryName);
            // Country id determines if it's sea or land.
            // TODO: constantit jotenkin selkeämmin globaaleja constantteja
            //newCountryModelObject.isSea = featureIdNumber >= seaCountryIdStart;
            countryModelObjects.push(newCountryModelObject);
            centroids.push(centroid);
            areas.push(countryArea);
            countryModelObjectsOfNeighborsArraysIndices.push(countryModelObjectsIndexCounter);
            countryModelObjectsIndexCounter += 1;
        }
        console.assert(countryModelObjects.length === centroids.length);

        // Neighbors can be set only after every Country has been created, since they are Countries.
        for(let i = 0; i < neighborsArrays.length; i++){
            if(countryModelObjectsOfNeighborsArraysIndices[i] === null){
                // There is no corresponding countryObject for this neighborsArray element.
                continue;
            }
            const countryObject = countryModelObjects[countryModelObjectsOfNeighborsArraysIndices[i]];
            console.assert(countryObject instanceof countryService.Country);
            // TODO onko siis kaksiulotteinen? (flat ei kyllä haittaa vaikka ei olisikaan)
            const neighborIndices = neighborsArrays[i].flat();
            for(let j = 0; j < neighborIndices.length; j++){
                const indexOfNeighborsArrays = neighborIndices[j];
                if(countryModelObjectsOfNeighborsArraysIndices[indexOfNeighborsArrays] === null){
                    // There is no corresponding countryObject for this neighborsArray element.
                    continue;
                }
                const neighborCountryObject = countryModelObjects[
                    countryModelObjectsOfNeighborsArraysIndices[indexOfNeighborsArrays]
                ];
                console.assert(neighborCountryObject instanceof countryService.Country);
                countryObject.addNeighbor(neighborCountryObject);
            }
        }

        //TODO: pitää lisätä erikseen merialueiden naapuritiedot, sekä merialueille että maille
        const topologyWithoutMinus99Features = topology.filter(feature => feature.id !== -99);
        //c.addNeighborsByOverlap(topologyWithoutMinus99Features, countryModelObjects);

        /*for(let i = 0; i < neighborsArrays.length; i++){
            const featureEntry = topology[i];
            const featureIdNumber = parseInt(featureEntry.id);
            for(let j = 0; j < countryModelObjects; j++){
                if(countryModelObjects[j].id === featureIdNumber){
                    // TODO onko siis kaksiulotteinen?
                    const neighborsIndices = neighborsArrays[i].flat();
                    for(let k = 0; k < neighborsIndices.length; k++){
                        const neighborFeatureEntry = topology[k];
                        const neighborFeatureIdNumber = parseInt(neighborFeatureEntry.id);
                        for(let l = 0; l < countryModelObjects)
                            // TODO performanssi?
                    }
                }
            }
        }*/

        const countryData = [];
        // TODO: myös pinta-alat voisi tässä ympätä mukaan että voidaan arvioida paljonko tokeneilla on tilaa?
        // Siihen liittyen: https://github.com/d3/d3-geo#path_area
        for(let i = 0; i < countryModelObjects.length; i++){
            const newCountryEntry = {};
            newCountryEntry.country = countryModelObjects[i];
            newCountryEntry.centroid = centroids[i];
            newCountryEntry.area = areas[i];
            countryData.push(newCountryEntry);
        }
        console.log("countryData:", countryData);
        countryService.countries = countryModelObjects;
        return countryData;
    };

    /*
        Pre-condition: pathDataArray[i] corresponds to countries[i]. countries are Country objects.
        pathDataArray and countries contains land and sea countries.
     */
    c.addNeighborsByOverlap = function(pathDataArray, countries){
        console.assert(pathDataArray.length === countries.length);
        //console.log("addNeighborsByOverlap pathDataArray", pathDataArray);
        //console.log("addNeighborsByOverlap countries", countries);
        for(let i = 0; i < pathDataArray.length; i++){
            const polygon1 = pathDataArray[i];
            for(let j = 0; j < pathDataArray.length; j++){
                const polygon2 = pathDataArray[j];
                if(polygon1 !== polygon2){
                    const country1 = countries[i];
                    const country2 = countries[j];
                    let shouldBeNeighbors = null;
                    if(polygon1.geometry.type === "Polygon" && polygon2.geometry.type === "Polygon"){
                        let intersection;
                        try {
                            // turf.intersect returns null if there is no intersection, otherwise something else.
                            intersection = turf.intersect(polygon1, polygon2);
                        }catch(e){
                            console.log("Determining intersection failed for:", country1.name, country2.name);
                            continue;
                        }
                        shouldBeNeighbors = intersection !== null;
                    }else if(polygon1.geometry.type === "MultiPolygon"){
                        const partPolygons = polygon1.geometry.coordinates.map(function(coordsOfPolygon){
                            return {geometry: {coordinates: coordsOfPolygon, type: "Polygon"}};
                        });
                        for(let partPolygon of partPolygons){
                            let intersection;
                            try {
                                // turf.intersect returns null if there is no intersection, otherwise something else.
                                intersection = turf.intersect(partPolygon, polygon2);
                            }catch(e){
                                console.log("Determining part polygon intersection failed for:",
                                    country1.name, country2.name);
                                //console.log(e);
                                //console.log("polygon1 part:", partPolygon);
                                continue;
                            }
                            shouldBeNeighbors = intersection !== null;
                            if(shouldBeNeighbors){
                                break;
                            }
                        }
                        // TODO KESKEN: laske intersectio kullekin ja päättele siitä naapuruus
                    }else if(polygon2.geometry.type === "MultiPolygon"){
                        // Only handle the MultiPolygon case for polygon1, because each country is inspected
                        // twice in this method so every one gets to be polygon1,
                        // and for each pair there is maximum of one MultiPolygons
                        // unless they are both land countries, in which case the neighbor relation has
                        // been determined by an another method, so it doesn't matter that
                        // this one fails to recognize the neighbor relation.
                    }
                    else{
                        // Either both Features should be Polygons, or at least one should be MultiPolygon.
                        console.assert(false);
                    }

                    //console.log("shouldBeNeighbors:", polygon1, polygon2, shouldBeNeighbors);
                    if(shouldBeNeighbors){
                        if(!country1.neighbors.includes(country2)){
                            country1.addNeighbor(country2);
                            console.log("neighbors:", country1.name, country2.name);
                        }
                        if(!country2.neighbors.includes(country1)){
                            country2.addNeighbor(country1);
                            console.log("neighbors:", country1.name, country2.name);
                        }
                    }
                }
            }
        }
        // TODO pistettävä samaan pääluuppiin multipolygonitkin
        /*
        // Handle MultiPolygons separately
        for(let i = 0; i < pathDataArray.length; i++){
            const polygon1 = pathDataArray[i];
            for(let j = 0; j < pathDataArray.length; j++){
                const polygon2 = pathDataArray[j];
                if(polygon1 !== polygon2){
                    const country1 = countries[i];
                    const country2 = countries[j];
                    let intersection;
                    try {
                        intersection = turf.intersect(polygon1, polygon2);
                        // turf.intersect returns null if there is no intersection, otherwise something else.
                    }catch(e){
                        console.log("Determining intersection failed for:", country1.name, country2.name);
                        continue;
                    }
                    const shouldBeNeighbors = intersection !== null;
                    //console.log("shouldBeNeighbors:", polygon1, polygon2, shouldBeNeighbors);
                    if(shouldBeNeighbors){

                        if(!country1.neighbors.includes(country2)){
                            country1.addNeighbor(country2);
                            console.log("neighbors:", country1.name, country2.name);
                        }
                        if(!country2.neighbors.includes(country1)){
                            country2.addNeighbor(country1);
                            console.log("neighbors:", country1.name, country2.name);
                        }
                    }
                }
            }
        }*/

    };

    /*
        Returns new token data array.
     */
    c.updateTokenData = function(countryData){
        let newTokenData = [];
        //console.log("updateTokenData called!---------");
        tokenService.tokens.forEach(function(element){
            //console.log("updateTokenData.forEach element.owner.color:", element.owner.color);
            //if(element.isDead === false) {
            // TODO: jostakin syystä yllä oleva if hajottaa jos updateToppingCircles kesken animaation
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
            //}
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
    // TODO: myös countryServicessä samanlainen
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
    TODO: countryServicessä samanlainen
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
        console.assert(name !== undefined, "name !== undefined, idNumber: "+idNumber);
        return name;
    };

    c.getCountryBigness = function(countryPresentation){
        // TODO: voi sisältää tarvittaessa maakohtaisia poikkeuksia
        // TODO: esim saarille voisi laskea todellista suuremman pinta-alan, koska vapaata vesitilaa ympärillä.
        console.assert(typeof countryPresentation.area === "number");
        //return getBaseLogatrithm(100, countryPresentation.area);
        //console.log("area:", countryPresentation.area, "sqrt:",
        //    Math.sqrt(countryPresentation.area));
        // TODO: taikanumerot talteen?
        //console.log("area:", countryPresentation.area);
        if(countryPresentation.area > 6500){
            //console.log("was over 9 million!", countryPresentation);
            return Math.sqrt(countryPresentation.area) / 60;
        }
        return Math.sqrt(countryPresentation.area) / 30;
    };

    c.getTokenState = function(tokenPresentation){
        if(tokenPresentation.token.isDead){
            return tokenStates.dead;
        }else if(!tokenPresentation.token.hasStrength){
            return tokenStates.noStrength;
        }else{
            return tokenStates.default;
        }
    };

})(dataForRendering);