"use strict";

let width = 960,
    height = 500;
const defaultRotationLongitude = -180;

let projection = d3.geo.equirectangular() //mercator()
    .center([0, 5 ])
    .scale(150)
    .rotate([defaultRotationLongitude, 0, 0]);

const svg = d3.select("#map-holder").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("style", 'border-style: solid');
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
let countryNames = null;
let centroidData = null;

// TODO: tämä pitäisi hommata modelista niin, että otetaan sijaintimaa.sentroidi
// TODO: kun tarvitaan tokeneiden koordinaatit, voisi ottaa ne TS:stä functiolla
// Lista seuraavanlaisia objekteja: { malli-token-objekti, countryData entry }
let tokenData = [];
const centroidFill = "rgba(255, 128, 0, 1)";

initialize();

// load and display the World
d3.json("world-110m.json", function(error, topology) {

    const pathDataArray = topojson.feature(topology, topology.objects.countries).features
        // add other stuff to the data in addition to topjson features
        .map(function(element){
            element.isCountry = true;
            return element;
        });// Each element of the array will be datum of an D3/DOM element.

    console.log("pathDataArray:", pathDataArray);
    g.selectAll("path")
        .data(pathDataArray)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "black")
        .attr("stroke", "red")
        .attr("stroke-width", "1")
        .on("click", handleCountryClick);

    // TODO: mihin tätä käytetään?
    //var countries = topojson.feature(topology, topology.objects.countries).features;

    d3.tsv("world-country-names.tsv", function(data){
        countryNames = data;
        console.log("country names:", countryNames);
        initializeCountryData(pathDataArray);
        updateCentroidCircles2();
        updateToppingCircles2();
    });
});

// zoom and pan
var zoom = d3.behavior.zoom()
    .on("zoom",function() {
        const newScale = d3.event.scale;
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

        updateToppingCircles2();
        updateCentroidCircles2();

        // path.projection palauttaa funktion. Joten miten sen voi asettaa HTML-elementin
        // attribuutin arvoksi? - Funktiota ei asetettane suoraan arvoksi, vaan d3:ssa
        // voi asettaa arvon funktiolla jotenkin.
        g.selectAll("path")
            .attr("d", path.projection(projection));
        // Compensate for stroke width change which is caused by zoom, so that the width remains constant.
        //g.selectAll("path")
        //    .attr("stroke-width", calculateNewStrokeWidth(d3.event.scale, 1));
    })
    .scaleExtent([1, 10]);

svg.call(zoom);

function initializeCountryData(topology){
    centroidData = topology
        .map(function(element){
            // return path.centroid(element); // "computes the projected centroid on the Cartesian plane"
            console.assert(d3.geo.centroid(element) !== undefined);
            return d3.geo.centroid(element); // "Returns the spherical centroid"
        });
    // 252 maan nimeä, mutta 177 topologiahommelia!
    for(let i = 0; i < topology.length; i++){
        // topology was in same order and of same length as centroid data.
        const featureEntry = topology[i];
        const centroid = centroidData[i];
        const featureIdNumber = parseInt(featureEntry.id);
        // Some features in the json area -99 and those are not countries.
        if(featureIdNumber === -99){
            console.log("was -99");
            continue;
        }
        const countryName = getCountryNameById(featureIdNumber);
        const newCountryEntry = {};
        newCountryEntry.name = countryName;
        newCountryEntry.centroid = centroid;
        newCountryEntry.id = featureIdNumber;
        countryData.push(newCountryEntry);
    }
    console.log("countryData:", countryData);
}

function updateTokenData(){
    let newTokenData = [];
    tokenService.tokens.forEach(function(element){
        const tokenModel = element;

        const countryId = element.location;
        const countryPresentation = getCountryEntryById(countryId);
        console.assert(countryPresentation !== undefined);
        const newTokenPresentation = {
            token: tokenModel,
            countryPresentation: countryPresentation
        };
        newTokenData.push(newTokenPresentation);
    });
    tokenData = newTokenData;
}

function updateCentroidCircles2(){
    let selection = g.selectAll(".centroid").data(centroidData);
    selection.enter()
        .append("circle")
        .attr("class", "centroid")
        .attr("r", 5)
        .attr("fill", centroidFill);
    selection
        .attr("cx", function(d) {
            return projection([d[0], d[1]])[0];
        })
        .attr("cy", function(d) {
            return projection([d[0], d[1]])[1];
        })
}

function updateToppingCircles2(){
    updateTokenData();
    let selection = g.selectAll(".topping-circle").data(tokenData);
    selection.enter()
        .append("circle")
        .attr("class", "topping-circle")
        .attr("data-token-id", function(d){
            return d.token.id; // TODO: on tarkoitus olla yksi entry ja eri jokaisella
        })
        .style("fill", "green")
        .attr("r", 10);

    selection
        .attr("cx", function(d) {
            //console.log("d:", d);
            const centroid = d.countryPresentation.centroid;
            return projection([centroid[0], centroid[1]])[0];
        })
        .attr("cy", function(d) {
            const centroid = d.countryPresentation.centroid;
            return projection([centroid[0], centroid[1]])[1];
        });
}

function handleCountryClick(d, i){
    const countryName = getCountryNameById(d.id);
    console.log("clicked:", countryName, "id:", d.id);
    //alert(countryName + "Click'd!");
    //console.log("datum:", d);
    //console.log("index:", i);
}

/*
    Gets country entry from countryData by country id, or undefined if it doesn't exist.
 */
function getCountryEntryById(countryId){
    const countryEntry = countryData.find(function(element){
        return element.id === countryId;
    });
    return countryEntry;
}

/*
    Pre-condition: countryId is a valid country id.
 */
function addToken(countryId){
    const countryEntry = getCountryEntryById(countryId);
    if(countryEntry === undefined){
        console.log("countryEntry is undefined");
        return;
    }
    tokenService.addToken(countryEntry.id);
    console.log("all tokens:", tokenService.tokens);
    updateToppingCircles2();
}

function calculateNewStrokeWidth(scale, normalWidth){
    return (normalWidth / scale).toString();
}

/*
    Pre-condition: there is a country name for idString in countryNames.
 */
function getCountryNameById(idNumber){
    //const idNumber = parseInt(idString);
    const countryEntry = countryNames.find( entry => parseInt(entry.id) === idNumber );
    if(countryEntry === undefined){
        console.log("getCountryNameById: idNumber:", idNumber);
    }
    const name = countryEntry.name;
    console.assert(name !== undefined);
    return name;
}

function addCircleToArea(pathD3){
    const newCircleCenter = pathD3.centroid()
}

function initialize(){
    document.addEventListener("click", function(event){
        const target = event.target;
        console.log("event target:");
        console.log(target);
        const datum = d3.select(target).datum();
        if(datum !== undefined) {
            if(datum.isCountry) {
                const countryId = datum.id;
                const countryName = getCountryNameById(countryId);
                console.log("datum:", datum);
                console.log("countryName:", countryName);
                addToken(countryId);
            }
        }
    });
}