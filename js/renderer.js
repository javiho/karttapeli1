"use strict";

const renderer = {};
(function(c) {

c.svg = null; // The D3 seledtion of the svg element.
c.g = null; // The D3 selection of main g svg element.
c.projection = null;
// Following kind of objecst: { country: Country, centroid (lon and lat): [number, number], area: number,
// slots: array of [number, number] arrays }
c.countryData = null;
//c.centroidData = null;
// Following kind of objects: { coordinates (lon and lat): [number, number], country: Country }
c.topThings = null;

// Constants
c.centroidFill = null;



c.addTopThing = function(){
    // TODO
};

c.initializeMap = function() {
    let width = 960,
        height = 500;
    const defaultRotationLongitude = -180;
    let projection = d3.geo.equirectangular() //mercator()
        .center([0, 5])
        .scale(150)
        .rotate([defaultRotationLongitude, 0, 0]);
    const svg = d3.select("#map-holder").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("style", 'border-style: solid');
    svg.append("defs");
    const g = svg.append("g");

    // path on jonkinlainen objekti joka generoi polun koordinaatit svg:n d-attribuutille sopivaksi.
    // projection (joka annetaan argumenttina tässä) on funktio, joka muuttaa koordinaatit [x, y]
    // projektion mukaisiksi.
    const path = d3.geo.path()
        .projection(projection);
    /*
        Lista seuraavanlaisia objecteja: maan nimi, sentroidipituus- ja leveys, maan id.
    */
    let countryData = [];
    let centroidData = null;
    c.centroidFill = "rgba(255, 128, 0, 1)";
    const ownerlessCountryFill = "#000000";
    const seaFill = "#66ccff";
    const maxZoomScale = 50;
    let zoomScale = 1;
    let defaultTokenDistanceFromCentroid = 10; // Distance from centroid to token circle's center.

    d3.json("kartta8.topojson", function (error, topology) {
        console.log("error:", error);
        console.log("topology.objects.kartta2.geometries", topology.objects.kartta2.geometries);
        console.log("topojson.feature(topology, topology.objects.kartta2).features",
            topojson.feature(topology, topology.objects.kartta2).features);

        // topojson.feature returns the GeoJSON Feature or FeatureCollection
        // for the specified object in the given topology.
        const pathDataArray = topojson.feature(topology, topology.objects.kartta2).features
            .map(function (element) {
                const prop = element.properties;
                element.id = prop.unique_id;
                if (!(prop.featurecla === "Admin-0 country")) {
                    element.isSea = true;
                }
                if (prop.split_name === null) {
                    if (element.isSea) {
                        element.name = "Sea region " + element.id;
                    } else {
                        element.name = prop.SOVEREIGNT;
                    }
                } else {
                    element.name = prop.split_name;
                }
                element.isCountry = true; // Both sea and land regions are called countries.
                return element;
            });
        console.log("pathDataArray", pathDataArray);

        const ids = pathDataArray.map(entry => entry.id);
        console.assert(areAllUnique(ids), "Country ids contain duplicates", countElements(ids));

        const neighborsArrays = topojson.neighbors(topology.objects.kartta2.geometries);
        console.log("neighbors array:", neighborsArrays);

        //console.log("pathDataArray:", pathDataArray);
        g.selectAll("path")
            .data(pathDataArray)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", function (d) {
                return d.isSea ? seaFill : ownerlessCountryFill;
            })
            .attr("stroke", "red")
            .attr("stroke-width", "1");

        c.g = g;
        c.projection = projection;
        // pathDataArray is supposed to be used instead of topology in _initializeCentroidData and
        // _initializeCountryData, despite parameter names.
        const centroidData = c._initializeCentroidData(pathDataArray);
        c.countryData = c._initializeCountryData(pathDataArray, centroidData, neighborsArrays, path);
        c.updateCentroidCircles();
        //c._updatePointGridCircles();
    });

    // zoom and pan
    const zoom = d3.behavior.zoom()
        .on("zoom",function() {
            const newScale = d3.event.scale;
            zoomScale = newScale;
            const yTranslation = d3.event.translate[1];
            const currentRotation = projection.rotate();
            const longitudeAmount = (d3.event.translate[0] / (width * newScale)) * 360;
            projection.scale(newScale * 150);
            const latitudeAmount = (d3.event.translate[1] / (height * newScale)) * 180;
            //console.log(latitudeAmount + 5);
            projection.center([0, latitudeAmount + 5]);
            projection = projection.rotate(
                [longitudeAmount + defaultRotationLongitude, currentRotation[1], currentRotation[2]]);

            // FYI: d3.event.translate on zoom-objectin arvo.
            //console.log("translation1:", d3.event.translate, "scale:", d3.event.scale);

            // TODO tässä vaiheessa liikutellaan kaikkea mikä lepää kartan päällä
            //updateToppingCircles();
            c.updateCentroidCircles();
            //c._updatePointGridCircles();
            //updateBattleLines();// TODO: updateToppingCircles voisi ehkä kutstua tätä?

            // path.projection palauttaa funktion. Joten miten sen voi asettaa HTML-elementin
            // attribuutin arvoksi? - Funktiota ei asetettane suoraan arvoksi, vaan d3:ssa
            // voi asettaa arvon funktiolla jotenkin.
            g.selectAll("path")
                .attr("d", path.projection(projection));
            // Compensate for stroke width change which is caused by zoom, so that the width remains constant.
            //g.selectAll("path")
            //    .attr("stroke-width", calculateNewStrokeWidth(d3.event.scale, 1));
        })
        .scaleExtent([1, maxZoomScale]);

    svg.call(zoom);
};

c._initializeCentroidData = function(pathDataArray){
    console.log("typeof pathDataArray:", typeof pathDataArray);
    const centroidData = pathDataArray
        .map(function(element){
            // return path.centroid(element); // "computes the projected centroid on the Cartesian plane"
            console.assert(d3.geo.centroid(element) !== undefined);
            return d3.geo.centroid(element); // "Returns the spherical centroid"
        });
    return centroidData;
};

/*
    Returns a list of objects like this: {country: Country, centroid: [number, number]

    Pre-condition: element of neighborsArrays has array(s???) of the indices of the neighbors of that
    elements, where those indices are the indices of neighborsArrays
    (https://github.com/topojson/topojson-client/blob/master/README.md#neighbors)
 */
c._initializeCountryData = function(topology, centroidData, neighborsArrays, path){
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


    const pointGrids = []; // Point grids in same order as features;
    for(let i = 0; i < topology.length; i++){
        const pointGrid = c._createPointGrid(topology[i], areas[i]);
        pointGrids.push(pointGrid);
    }

    const countryData = [];
    // TODO: myös pinta-alat voisi tässä ympätä mukaan että voidaan arvioida paljonko tokeneilla on tilaa?
    // Siihen liittyen: https://github.com/d3/d3-geo#path_area
    for(let i = 0; i < countryModelObjects.length; i++){
        const newCountryEntry = {};
        newCountryEntry.country = countryModelObjects[i];
        newCountryEntry.centroid = centroids[i];
        newCountryEntry.area = areas[i];
        newCountryEntry.slots = pointGrids[i];
        countryData.push(newCountryEntry);
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
    return pointGrid;
};

// TODO Ei käytössä
c._updatePointGridCircles = function(){
    const pointGridData = c.countryData.map(e => e.slots);
    const flatPointGridData = pointGridData.flat(); // pointGridData has an array for each country
    //console.log("flatPointGridData:", flatPointGridData);
    let selection = c.g.selectAll(".slot-point").data(flatPointGridData);
    const projection = c.projection;

    selection.enter()
        .append("circle")
        .attr("class", "slot-point")
        .attr("r", 1)
        .attr("fill", "green");
    selection
        .attr("cx", function(d) {
            //console.log("centroid:", centroid );
            //console.log("projection([centroid[0], centroid[1]])[0]",
            //    projection([centroid[0], centroid[1]])[0]);
            return projection([d[0], d[1]])[0];
        })
        .attr("cy", function(d) {
            return projection([d[0], d[1]])[1];
        });
};

c.updateCentroidCircles = function(){
    //console.log("centroidData:", centroidData);
    const centroidData = c._getCentroidData();
    const extendedCentroidData = centroidData.map(function(element){
        const centroidEntry = {centroid: element};
        centroidEntry.isCentroid = true;
        return centroidEntry;
    });
    let selection = c.g.selectAll(".centroid").data(extendedCentroidData);
    selection.enter()
        .append("circle")
        .attr("class", "centroid")
        .attr("r", 5)
        .attr("fill", c.centroidFill);
    selection
        .attr("cx", function(d) {
            const centroid = d.centroid;
            if(isNaN(centroid[0])){
                console.log("NaN centroid's data:", d);
            }
            //console.log("centroid:", centroid );
            //console.log("projection([centroid[0], centroid[1]])[0]",
            //    projection([centroid[0], centroid[1]])[0]);
            return c.projection([centroid[0], centroid[1]])[0];
        })
        .attr("cy", function(d) {
            const centroid = d.centroid;
            return c.projection([centroid[0], centroid[1]])[1];
        });
    //drawInCorrectOrder();
};

c._getCentroidData = function(){
    return c.countryData.map(e => e.centroid);
};

})(renderer);