"use strict";

const renderer = {};
(function(c) {

c.svg = null; // The D3 seledtion of the svg element.
c.g = null; // The D3 selection of main g svg element.
c.projection = null;
// Following kind of objects: { country: Country, centroid (lon and lat): [number, number], area: number,
// slots: array of [number, number] arrays }
// TODO pitäisikö tämän olla geoCountryServicessä? Pitäisikö olla nimeltään geoCountryData?
c.countryData = null;
//c.centroidData = null;
// Following kind of objects: { coordinates (lon and lat): [number, number], country: Country }
//c.mapThings = null;

// Constants
c.centroidFill = null;



c.initializeMap = function(callback) {
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
        c.countryData = geoCountryService.initializeCountryData(
            pathDataArray, centroidData, neighborsArrays, path);
        c.updateCentroidCircles();
        //c._updatePointGridCircles();

        callback();
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
            c.updateTokens(mapThingService.mapThings);
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

c.updateTokens = function(topThingData){
    //console.log("centroidData:", centroidData);
    /*const centroidData = c._getCentroidData();
    const extendedCentroidData = centroidData.map(function(element){
        const centroidEntry = {centroid: element};
        centroidEntry.isCentroid = true;
        return centroidEntry;
    });*/
    const tokenData = topThingData.filter(e => e.modelObject instanceof tokenService.Token);
    let selection = c.g.selectAll(".token").data(tokenData);
    selection.enter()
        .append("circle")
        .attr("class", "token")
        .attr("r", 10)
        .attr("stroke-width", 2); // Not visible if stroke attribute is empty.;
    selection
        .attr("cx", function(d) {
            //const centroid = d.centroid;
            const coords = d.coordinates;
            console.assert(!isNaN(coords[0]));
            //if(isNaN(centroid[0])){
            //    console.log("NaN centroid's data:", d);
            //}
            //console.log("centroid:", centroid );
            //console.log("projection([centroid[0], centroid[1]])[0]",
            //    projection([centroid[0], centroid[1]])[0]);
            return c.projection([coords[0], coords[1]])[0];
        })
        .attr("cy", function(d) {
            const coords = d.coordinates;
            return c.projection([coords[0], coords[1]])[1];
        })
        .attr("fill", function(d){
            return d.modelObject.owner.color;
        });
    //drawInCorrectOrder();
};

c._getCentroidData = function(){
    return c.countryData.map(e => e.centroid);
};

///////////////////// Objects to and from countries ///////////

c.addMapThing = function(mapThingModelObject, country){
    console.assert(country instanceof countryService.Country);
    const geoCountry = c.countryData.find(x => x.country === country);
    console.assert(geoCountry instanceof geoCountryService.GeoCountry);
    const mapThing = mapThingService.addMapThing(geoCountry, mapThingModelObject);
    c._addThingOnCountry(geoCountry, mapThing);
};

c._moveThingFromCountryToAnother = function(){
 // TODO
};

c._addThingOnCountry = function(geoCountry, mapThing){
    console.assert(mapThing instanceof mapThingService.MapThing
        && geoCountry instanceof geoCountryService.GeoCountry);
    const coords = geoCountryService.getFreeCountrySlot(geoCountry);
    console.assert(coords !== undefined && coords.length === 2);
    mapThing.geoCountry = geoCountry;
    geoCountry.coordsToThing.set(coords, mapThing);
    mapThing.coordinates = coords;
};

c._removeThingFromCountry = function(geoCountry, thing){
    // TODO KESKEN
};

})(renderer);