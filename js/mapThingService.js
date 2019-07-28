"use strict";

// Map thing is an object on the map. (aka top thing)

const mapThingService = {};
(function(c) {
// c stands for context.

c.mapThings = [];

c.MapThing = function(geoCountry, modelObject){
    console.assert(geoCountry instanceof geoCountryService.GeoCountry);
    this.coordinates = null; // lon, lat: [number, number]
    this.geoCountry = geoCountry; // GeoCountry
    this.modelObject = modelObject;
    //this.isMapThing = true; // This is so that one can easily check if the datum is map thing.
};

c.addMapThing = function(geoCountry, modelObject){
    const newMapThing = new c.MapThing(geoCountry, modelObject);
    c.mapThings.push(newMapThing);
    return newMapThing;
};

})(mapThingService);