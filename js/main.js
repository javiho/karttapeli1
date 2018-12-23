"use strict";

let width = 960,
    height = 500;
const defaultRotationLongitude = -180;

let previousScale = 1;

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

const circleData = [{lon: 0, lat: 0}, {lon: 10, lat: 20}];
const centroidFill = "rgba(255, 128, 0, 1)";

initialize();

// load and display the World
d3.json("world-110m.json", function(error, topology) {

// load and display the cities
    /*d3.csv("cities.csv", function(error, data) {
        g.selectAll("circle")
            .data(data)
            .enter()
            .append("a")
            .attr("xlink:href", function(d) {
                return "https://www.google.com/search?q="+d.city;}
            )
            .append("circle")
            .attr("cx", function(d) {
                return projection([d.lon, d.lat])[0];
            })
            .attr("cy", function(d) {
                return projection([d.lon, d.lat])[1];
            })
            .attr("r", 5)
            .style("fill", "red");
    });*/

    const pathDataArray = topojson.feature(topology, topology.objects.countries).features
        // add other stuff to the data in addition to topjson features
        .map(function(element){
            element.isCountry = true;
            return element;
        });// Each element of the array will be datum of an D3/DOM element.

    console.log("pathDataArray:", pathDataArray);
    g.selectAll("path")
        //.data(topojson.object(topology, topology.objects.countries)
        .data(pathDataArray)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "black")
        .attr("stroke", "red")
        .attr("stroke-width", "1")
        .on("click", handleCountryClick);

    // TODO: mihin tätä käytetään?
    var countries = topojson.feature(topology, topology.objects.countries).features;
    //console.log("countries:", countries);

    d3.tsv("world-country-names.tsv", function(data){
        countryNames = data;
        //console.log("country names:", countryNames);
        initializeCountryData(topology);

        //console.log("centroid data:", centroidData);
        createCentroidCircles();

        //g.selectAll("path") Mikä tämä on?
        createToppingCircles();
    });
});

function initializeCountryData(topology){
    centroidData = topojson.feature(topology, topology.objects.countries).features
        .map(function(element){
            // return path.centroid(element); // "computes the projected centroid on the Cartesian plane"
            return d3.geo.centroid(element); // "Returns the spherical centroid"
        });
    for(let i = 0; i < countryNames.length; i++){
        const newCountryEntry = {};
        newCountryEntry.name = countryNames[i].name;
        newCountryEntry.centroid = centroidData[i];
        newCountryEntry.id = countryNames[i].id;
        countryData.push(newCountryEntry);
    }
    //console.log(countryData);
}

function createCentroidCircles(){
    g.selectAll(".centroid")
        .data(centroidData)
        .enter()
        .append("circle")
        .attr("class", "centroid")
        .attr("cx", function(d) {
            //console.log(d);
            return projection([d[0], d[1]])[0];
            //return d[0];
        })
        .attr("cy", function(d) {
            return projection([d[0], d[1]])[1];
            //return d[1];
        })
        .attr("r", 5)
        .attr("fill", centroidFill);
}

function updateCentroidCircles(){
    g.selectAll(".centroid")
        .data(centroidData)
        .attr("cx", function(d) {
            //console.log(d);
            return projection([d[0], d[1]])[0];
            //return d[0];
        })
        .attr("cy", function(d) {
            return projection([d[0], d[1]])[1];
            //return d[1];
        })
        .attr("r", 5)
        .attr("fill", centroidFill);
}

function createToppingCircles(){
    g.selectAll(".topping-circle")
        .data(circleData)
        .enter()
        .append("circle")
        .attr("class", "topping-circle")
        .attr("cx", function(d) {
            return projection([d.lon, d.lat])[0];
        })
        .attr("cy", function(d) {
            return projection([d.lon, d.lat])[1];
        })
        .attr("r", 10)
        .style("fill", "green");
}

function updateToppingCircles(){
    g.selectAll(".topping-circle")
        .attr("cx", function(d) {
            return projection([d.lon, d.lat])[0];
        })
        .attr("cy", function(d) {
            return projection([d.lon, d.lat])[1];
        });
}

function handleCountryClick(d, i){
    const countryName = getCountryNameById(d.id);
    console.log(countryName);
    //alert(countryName + "Click'd!");
    //console.log("datum:", d);
    //console.log("index:", i);
}

// zoom and pan
var zoom = d3.behavior.zoom()
    .on("zoom",function() {
        /*const newScale = d3.event.scale;
        const zoomed = newScale !== previousScale;
        console.log("zoomed:", zoomed);
        if(zoomed) {
            g.attr("transform", "translate(" +
                d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
        }else{
            const yTranslation = d3.event.translate[1];
            const currentRotation = projection.rotate();
            g.attr("transform", "translate(0,"+yTranslation+")scale("+newScale+")");
            const longitudeAmount = (d3.event.translate[0] / (width * newScale)) * 360;
            projection = projection.rotate(
                [longitudeAmount + defaultRotationLongitude, currentRotation[1], currentRotation[2]]);

        }
        previousScale = newScale;*/
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

        updateToppingCircles();
        updateCentroidCircles();

        // Nämä kaksi riviä on kopioitu jostakin, mutta niissä ei vaikuta olevan mitään järkeä?:
        //g.selectAll("circle")
        //    .attr("d", path.projection(projection));
        // path.projection palauttaa funktion. Joten miten sen voi asettaa HTML-elementin
        // attribuutin arvoksi????????
        g.selectAll("path")
            .attr("d", path.projection(projection));
        // Compensate for stroke width change which is caused by zoom, so that the width remains constant.
        //g.selectAll("path")
        //    .attr("stroke-width", calculateNewStrokeWidth(d3.event.scale, 1));

        /*let selection = g.selectAll("circle").data(circleData);
        selection.enter()
            .append("circle")
            .attr("cx", function(d) {
                return projection([d.lon + 100, d.lat + 100])[0];
            })
            .attr("cy", function(d) {
                return projection([d.lon + 100, d.lat + 100])[1];
            })
            .attr("r", 10)
            .style("fill", "green");*/
    })
    .scaleExtent([1, 10]);

svg.call(zoom);

function calculateNewStrokeWidth(scale, normalWidth){
    return (normalWidth / scale).toString();
}

/*
    Pre-condition: there is a country name for idString in countryNames.
 */
function getCountryNameById(idNumber){
    //const idNumber = parseInt(idString);
    const countryEntry = countryNames.find( entry => parseInt(entry.id) === idNumber );
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
            }
        }
    });
}
//d3.selectAll()



/* Muuten hyvä paitsi että ilmeisesti ei ole mahdollista saada projection ym objecteja? tai en tiedä miten ne saa.
var theSvgG;
var theSvgPath;
var theProjection = d3.geoEquirectangular();
// http://bl.ocks.org/d3noob/5193723
// zoom and pan
var zoom = d3.behavior.zoom()
    .on("zoom",function() {
        var g = theSvgG;
        g.attr("transform","translate("+
            d3.event.translate.join(",")+")scale("+d3.event.scale+")");
        //g.selectAll("circle")
        //    .attr("d", path.projection(projection));
        //g.selectAll("path")
        //    .attr("d", theSvgPath.projection(projection)); // TODO: projektio
        //g.selectAll("path")
        //    .attr("d", theSvgPath.projection(projection)); // TODO: projektio

    });

var map = new Datamap({
    element: document.getElementById("container"),
    done: function(datamap){
        datamap.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
            alert(geography.properties.name);
        });
        console.log(d3.select(".MNG"));
        console.log(d3.select(".MNG").pointRadius());
        //console.log(datamap.svg.select("path"));
        //theProjection = datamap.svg.select("path").projection();
        theProjection = datamap.svg.select("path").projection();
        console.log("theProjection:", theProjection);
        theSvgG = datamap.svg.selectAll("g");
        theSvgPath = datamap.svg.selectAll("d");
        datamap.svg.call(zoom);
    }
});
*/


/*
//プロジェクション設定
var projection = d3
    .geoMercator() //投影法の指定
    .scale(16000)	//スケール（ズーム）の指定
    .rotate([-0.25, 0.25, 0]) //地図を回転する　[x,y,z]
    .center([139.0032936, 36.3219088]); //中心の座標を指定

//パスジェネレーター生成
var path = d3.geoPath().projection(projection);

//地図用のステージ(SVGタグ)を作成
var map = d3.select("body")
    .append("svg")
    .attr("width", 960)
    .attr("height", 500);


//地理データ読み込み
d3.json("gunma.geojson", drawMaps);

//地図を描画
function drawMaps(geojson) {
    map.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", path)  //パスジェネレーターを使ってd属性の値を生成している
        .attr("fill", "green")
        .attr("fill-opacity", 0.5)
        .attr("stroke", "#222");
}*/

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
// DEFINE VARIABLES
// Define size of map group
// Full world map is 2:1 ratio
// Using 12:5 because we will crop top and bottom of map
var w = 3000;
var h = 1250;
// variables for catching min and max zoom factors
var minZoom;
var maxZoom;
var countriesGroup;

// DEFINE FUNCTIONS/OBJECTS
// Define map projection
var projection = d3
    .geoEquirectangular()
    .center([0, 15]) // set centre to further North as we are cropping more off bottom of map
    .scale([w / (2 * Math.PI)]) // scale to fit group width
    .translate([w / 2, h / 2]) // ensure centred in group
;

// Define map path
var path = d3
    .geoPath()
    .projection(projection)
;

// Create function to apply zoom to countriesGroup
function zoomed() {
    var t = d3
        .event
        .transform
    ;
    countriesGroup
        .attr("transform","translate(" + [t.x, t.y] + ")scale(" + t.k + ")")
    ;
}

// Define map zoom behaviour
var zoom = d3
    .zoom()
    .on("zoom", zoomed)
;

function getTextBox(selection) {
    selection
        .each(function(d) {
            d.bbox = this
                .getBBox();
        })
    ;
}

// Function that calculates zoom/pan limits and sets zoom to default value
function initiateZoom() {
    // Define a "minzoom" whereby the "Countries" is as small possible without leaving white space at top/bottom or sides
    minZoom = Math.max($("#map-holder").width() / w, $("#map-holder").height() / h);
    // set max zoom to a suitable factor of this value
    maxZoom = 20 * minZoom;
    // set extent of zoom to chosen values
    // set translate extent so that panning can't cause map to move out of viewport
    zoom
        .scaleExtent([minZoom, maxZoom])
        .translateExtent([[0, 0], [w, h]])
    ;
    // define X and Y offset for centre of map to be shown in centre of holder
    var midX = ($("#map-holder").width() - minZoom * w) / 2;
    var midY = ($("#map-holder").height() - minZoom * h) / 2;
    // change zoom transform to min zoom and centre offsets
    svg.call(zoom.transform, d3.zoomIdentity.translate(midX, midY).scale(minZoom));
}

// zoom to show a bounding box, with optional additional padding as percentage of box size
function boxZoom(box, centroid, paddingPerc) {
    var minXY = box[0];
    var maxXY = box[1];
    // find size of map area defined
    var zoomWidth = Math.abs(minXY[0] - maxXY[0]);
    var zoomHeight = Math.abs(minXY[1] - maxXY[1]);
    // find midpoint of map area defined
    var zoomMidX = centroid[0];
    var zoomMidY = centroid[1];
    // increase map area to include padding
    zoomWidth = zoomWidth * (1 + paddingPerc / 100);
    zoomHeight = zoomHeight * (1 + paddingPerc / 100);
    // find scale required for area to fill svg
    var maxXscale = $("svg").width() / zoomWidth;
    var maxYscale = $("svg").height() / zoomHeight;
    var zoomScale = Math.min(maxXscale, maxYscale);
    // handle some edge cases
    // limit to max zoom (handles tiny countries)
    zoomScale = Math.min(zoomScale, maxZoom);
    // limit to min zoom (handles large countries and countries that span the date line)
    zoomScale = Math.max(zoomScale, minZoom);
    // Find screen pixel equivalent once scaled
    var offsetX = zoomScale * zoomMidX;
    var offsetY = zoomScale * zoomMidY;
    // Find offset to centre, making sure no gap at left or top of holder
    var dleft = Math.min(0, $("svg").width() / 2 - offsetX);
    var dtop = Math.min(0, $("svg").height() / 2 - offsetY);
    // Make sure no gap at bottom or right of holder
    dleft = Math.max($("svg").width() - w * zoomScale, dleft);
    dtop = Math.max($("svg").height() - h * zoomScale, dtop);
    // set zoom
    svg
        .transition()
        .duration(500)
        .call(
            zoom.transform,
            d3.zoomIdentity.translate(dleft, dtop).scale(zoomScale)
        );
}




// on window resize
$(window).resize(function() {
    // Resize SVG
    svg
        .attr("width", $("#map-holder").width())
        .attr("height", $("#map-holder").height())
    ;
    initiateZoom();
});

// create an SVG
var svg = d3
    .select("#map-holder")
    .append("svg")
    // set to the same size as the "map-holder" div
    .attr("width", $("#map-holder").width())
    .attr("height", $("#map-holder").height())
    // add zoom functionality
    .call(zoom)
;


// get map data
d3.json(
    "https://raw.githubusercontent.com/andybarefoot/andybarefoot-www/master/maps/mapdata/custom50.json", function(json) {
        //Bind data and create one path per GeoJSON feature
        countriesGroup = svg.append("g").attr("id", "map");
        // add a background rectangle
        countriesGroup
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", w)
            .attr("height", h);

        // draw a path for each feature/country
        var countries = countriesGroup
            .selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("id", function(d, i) {
                return "country" + d.properties.iso_a3;
            })
            .attr("class", "country")
            //      .attr("stroke-width", 10)
            //      .attr("stroke", "#ff0000")
            // add a mouseover action to show name label for feature/country
            .on("mouseover", function(d, i) {
                d3.select("#countryLabel" + d.properties.iso_a3).style("display", "block");
            })
            .on("mouseout", function(d, i) {
                d3.select("#countryLabel" + d.properties.iso_a3).style("display", "none");
            })
            // add an onclick action to zoom into clicked country
            .on("click", function(d, i) {
                d3.selectAll(".country").classed("country-on", false);
                d3.select(this).classed("country-on", true);
                boxZoom(path.bounds(d), path.centroid(d), 20);
            });
        // Add a label group to each feature/country. This will contain the country name and a background rectangle
        // Use CSS to have class "countryLabel" initially hidden
        var countryLabels = countriesGroup
            .selectAll("g")
            .data(json.features)
            .enter()
            .append("g")
            .attr("class", "countryLabel")
            .attr("id", function(d) {
                return "countryLabel" + d.properties.iso_a3;
            })
            .attr("transform", function(d) {
                return (
                    "translate(" + path.centroid(d)[0] + "," + path.centroid(d)[1] + ")"
                );
            })
            // add mouseover functionality to the label
            .on("mouseover", function(d, i) {
                d3.select(this).style("display", "block");
            })
            .on("mouseout", function(d, i) {
                d3.select(this).style("display", "none");
            })
            // add an onlcick action to zoom into clicked country
            .on("click", function(d, i) {
                d3.selectAll(".country").classed("country-on", false);
                d3.select("#country" + d.properties.iso_a3).classed("country-on", true);
                boxZoom(path.bounds(d), path.centroid(d), 20);
            });
        // add the text to the label group showing country name
        countryLabels
            .append("text")
            .attr("class", "countryName")
            .style("text-anchor", "middle")
            .attr("dx", 0)
            .attr("dy", 0)
            .text(function(d) {
                return d.properties.name;
            })
            .call(getTextBox);
        // add a background rectangle the same size as the text
        countryLabels
            .insert("rect", "text")
            .attr("class", "countryLabelBg")
            .attr("transform", function(d) {
                return "translate(" + (d.bbox.x - 2) + "," + d.bbox.y + ")";
            })
            .attr("width", function(d) {
                return d.bbox.width + 4;
            })
            .attr("height", function(d) {
                return d.bbox.height;
            });
        initiateZoom();
    }
);
*/

/*var ratData = [100, 900, 300, 600];

d3.selectAll('rect')
    .data(ratData)
    .attr('height', function(d){
        return d/10 * 1.5;
    })
    .attr('y', function(d){
        return 150 - d/10 * 1.5;
    });*/

/*
var width = 900;
var height = 600;

console.log(d3 === undefined);
console.log(d3.geo === undefined);
var projection = d3.geo.mercator();

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);
var path = d3.geo.path()
    .projection(projection);
var g = svg.append("g");

d3.json("world-110m2.json", function(error, topology) {
    g.selectAll("path")
        .data(topojson.object(topology, topology.objects.countries)
            .geometries)
        .enter()
        .append("path")
        .attr("d", path)
});*/
