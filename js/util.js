"use strict";

/*
    Pre-condition: map.values() are numbers, minOrMax === "max" || minOrMax === "min"
*/
function findKeysWithExtremeValue(map, minOrMax="max"){
    console.assert( minOrMax === "max" || minOrMax === "min");
    if(! (minOrMax === "max" || minOrMax === "min") ) {
        throw Error("Erroneous argument");
    }
    let maxValue = minOrMax === "max" ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const isMoreExtreme = (v1, v2) => (minOrMax === "max" ? v1 > v2 : v1 < v2 );
    for(let value of map.values()){
        console.assert(typeof  value === "number");
        if(isMoreExtreme(value, maxValue)){
            maxValue = value;
        }
    }
    const maxValueKeys = [];
    for(let [key, value] of map){
        if(value === maxValue){
            maxValueKeys.push(key);
        }
    }
    console.assert(maxValueKeys.length > 0 || Array.from(map.values()).length === 0);
    return maxValueKeys;
}