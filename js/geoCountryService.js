"use strict";

// (Geo country is aka country representation or country data entry.)

const geoCountryService = {};
(function(c) {
// c stands for context.

//c.countryData;

c.GeoCountry = function(country, pointGrid){
    console.assert(country instanceof countryService.Country);
    this.slots = pointGrid; // array of [number, number] arrays
    this.coordsToThing =
        getMapWithNulls(pointGrid, false); // Map: [lon, lat] -> TopThing|null
    this.centroid = null; // centroid (lon and lat): [number, number]
    this.area = null; // Number
    this.country = country; // Country
};

/*
Returns the coors of free slot.
 */
c.getFreeCountrySlot = function(geoCountry){
    // TODO: toimiiko tämä?
    console.assert(geoCountry instanceof geoCountryService.GeoCountry);
    const thresholdDistance = 0; // TODO: pitäisi riippua pisteiden keskim. etäisyydestä
    for(let [coords1, thingInSlot1] of geoCountry.coordsToThing){
        console.assert(coords1.length === 2);
        console.assert(thingInSlot1 !== undefined);
        if(thingInSlot1 !== null){
            // If the slot is already given to something else, skip to next one.
            continue;
        }
        // TODO: tarkista, että etäisyys muihin esineisiin ei ole alle kynnyksen.

        for(let [coords2, thingInSlot2] of geoCountry.coordsToThing) {
            console.assert(coords2.length === 2);
            if (coords1 === coords2) {
                break; // Breaks out of inner loop.
            }
            const distance = getDistance(coords1, coords2);
            if (distance < thresholdDistance) {
                break;
            }
        }
        return coords1;
    }
    console.assert(false, "No free slots found.");
};

/*
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
        // https://github.com/d3/d3-geo#path_area
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


    const pointGrids = []; // Point grids in same order as features;
    for(let i = 0; i < topology.length; i++){
        const pointGrid = c._createPointGrid(topology[i], areas[i]);

        pointGrids.push(pointGrid);
    }

    const countryData = [];
    for(let i = 0; i < countryModelObjects.length; i++){
        //const newCountryEntry = {};
        const newGeoCountry = new geoCountryService.GeoCountry(
            countryModelObjects[i], pointGrids[i]);
        newGeoCountry.centroid = centroids[i];
        newGeoCountry.area = areas[i];
        countryData.push(newGeoCountry);
    }
    console.log("countryData:", countryData);
    console.log("point amounts:", pointGrids.map(e => e.length));
    const minAllowedPointAmount = 100;
    console.assert(pointGrids.every(e => e.length >= minAllowedPointAmount));
    countryService.countries = countryModelObjects;
    return countryData;
};

c._createPointGrid = function(countryData, area){
    // topology was in same order and of same length as centroid data.
    const featureEntry = countryData;
    let singlePolygon = featureEntry; // Multi or an ordinary polygon.

    if(singlePolygon.geometry.type === "MultiPolygon"){
        const partPolygons = singlePolygon.geometry.coordinates.map(function(coordsOfPolygon){
            let newFeature = {"type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": coordsOfPolygon } };
            return newFeature;
        });
        console.assert(partPolygons.length > 0);
        let largestPartPolygon = null;
        let largestPartPolygonArea = 0;
        partPolygons.forEach(function(partPolygon){
            // Calculating area with the commented out lines doesn't work for some reason,
            // so estimate biggest area with the amount of coordinates of the polygons.
            //const area = path.area(partPolygon);
            //const area = turf.area(partPolygon);
            const area = partPolygon.geometry.coordinates[0].length;
            console.assert(area < Number.MAX_SAFE_INTEGER);
            console.assert(typeof area === "number");
            if(largestPartPolygonArea < area){
                largestPartPolygonArea = area;
                largestPartPolygon = partPolygon;
            }
        });
        singlePolygon = largestPartPolygon; // TODO: pitäisi tehdä pisteet erikseen kaikille osille.
        // It's possible that area is 0, so singlePolygon must be chosen with different a criterion.
        if(largestPartPolygon === null){
            singlePolygon = partPolygons[0];
        }
        console.assert(singlePolygon !== undefined && singlePolygon !== null, singlePolygon);
    }

    const bbox = turf.bbox(singlePolygon); // 1D array, bbox extent in minX, minY, maxX, maxY order
    // TODO validoi bboxin elementit että ovat oikealla välillä
    let minLonBoundary = bbox[0];
    let maxLonBoundary = bbox[2];
    let minLatBoundary = bbox[1];
    let maxLatBoundary = bbox[3];
    console.assert(minLonBoundary < maxLonBoundary && minLatBoundary < maxLatBoundary);
    const pointGrid = [];
    let rounds = 0;
    let pointsGeneratedCount = 0;
    while(pointsGeneratedCount < 100){
        const width =  maxLonBoundary - minLonBoundary;
        const height =  maxLatBoundary - minLatBoundary;
        let lon = (Math.random() * width) + minLonBoundary;
        let lat = (Math.random() * height) + minLatBoundary;
        //console.assert(isValidLongitude(lon) && isValidLatitude(lat));
        lon = fitToInterval(lon, -180, 180);
        lat = fitToInterval(lat, -90, 90);
        const pointFeature = turf.point([lon, lat]);
        console.assert(pointFeature !== undefined && pointFeature !== null);
        if(turf.booleanPointInPolygon([lon, lat], singlePolygon, {ignoreBoundary: false})){
            pointGrid.push([lon, lat]);
            pointsGeneratedCount += 1;
        }
        if(rounds > 10000){
            break;
        }
        rounds += 1;
    }

    //const pointGridFeatureCollection = turf.pointGrid(extent, step, {units: 'kilometers'});
    //  turf.pointGrid:in toiminta on mysteeri. Kannattaa kokeilla eri arvoja extent ja step.
    //const pointGridFeatureCollection = turf.pointGrid(extent, step, {units: 'kilometers', mask: singlePolygon});
    // Take only coordinates for each point and put them in array.
    //const pointGrid = pointGridFeatureCollection.features.map(e => e.geometry.coordinates);
    console.assert(pointGrid.length > 0, featureEntry);
    pointGrid.forEach(function(coords){
        if(coords.length !== 2 || typeof coords[0] !== "number"
            || typeof coords[1] !== "number"){
            console.log("Erroneous point grid:", pointGrid);
            throw Error("");
        }
    });
    return pointGrid;
};

})(geoCountryService);