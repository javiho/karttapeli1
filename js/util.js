"use strict";

let aKeyPressed = false;

function initializeKeyPressMonitoring(){
    document.addEventListener("keydown", function(event){
        if(event.key === "a"){
            aKeyPressed = true;
        }
        //console.log("a pressed");
    });
    document.addEventListener("keyup", function(event){
        if(event.key === "a"){
            aKeyPressed = false;
        }
        //console.log("a not pressed");
    });
}

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

/*
    Returns a new array where toBeRemoved has been removed.
 */
function removeFromArray(array, toBeRemoved){
    return array.filter(element => element !== toBeRemoved);
}

function getBaseLogatrithm(base, number) {
    return Math.log(number) / Math.log(base);
}