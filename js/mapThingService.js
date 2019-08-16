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

c.removeMapThing = function(mapThing){
    const length = c.mapThings.length;
    c.mapThings = removeFromArray(c.mapThings, mapThing);
    const newLength = c.mapThings.length;
    console.assert(newLength === length - 1);
};

c.getMapThingByToken = function(token) {
    console.assert(token instanceof tokenService.Token);
    const mapThing = c.mapThings.find(x => x.modelObject === token);
    console.assert(mapThing !== undefined);
    return mapThing;
};

c.getTokenVisualState = function(mapThing){
    console.assert(mapThing instanceof c.MapThing);
    const token = mapThing.modelObject;
    if(token.isDead){
        return tokenService.tokenStates.dead;
    }else if(!token.hasStrength){
        return tokenService.tokenStates.noStrength;
    }else{
        return tokenService.tokenStates.default;
    }
}

})(mapThingService);