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

/*
    Returns a Map where key is an element of array and value is how many times it's found in array.
 */
function countElements(array){
    const occurrencesMap = new Map();
    array.forEach(function(e1){
        let occurrences = 0;
        array.forEach(function(e2){
            if(e1 === e2){
                occurrences += 1;
            }
        });
        occurrencesMap.set(e1, occurrences);
    });
    return occurrencesMap;
}

function areAllUnique(array){
    const asSet = new Set(array);
    return asSet.size === array.length;
}

function fitToInterval(number, min, max){
    number = number < min ? min: number;
    number = number > max ? max: number;
    return number;
}

function isValidLongitude(number){
    const isNumber = typeof  number === "number";
    return isNumber && isInInterval(number, -180, 180);
}

function isValidLatitude(number){
    const isNumber = typeof  number === "number";
    return isNumber && isInInterval(number, -90, 90);
}

/* min and max are inclusive */
function isInInterval(number, min, max){
    return number >= min && number <= max;
}

/*
Pre-condition: keys is an array of keys. If !duplicatesAllowed, keys must not have duplicates.
Returns a map where each element of keys is a key and every value is null.
 */
function getMapWithNulls(keys, duplicatesAllowed=true){
    const map = new Map();
    keys.forEach(function(key, index){
        if(!duplicatesAllowed){
            console.assert(map.get(key) === undefined,
            "Duplicate key at index "+index);
        }
        map.set(key, null);
    });
    return map;
}

function getDistance(p1, p2){
    console.assert(p1.length === 2 && p2.length === 2,
        "p1:", p1, "p2", p2);
    const a = Math.abs(p1[0] - p2[0]);
    const b = Math.abs(p1[1] - p2[1]);
    const distance = Math.hypot(a, b);
    console.assert(typeof distance === "number");
    return distance;
}

function getBaseLogarithm(base, number) {
    return Math.log(number) / Math.log(base);
}

function dispatchCustomEvent(eventName, detail){
    const customEvent = new CustomEvent(eventName, {
        detail: detail
    });
    document.dispatchEvent(customEvent);
}

function generateUniqueId(){
    const timePart = new Date().getTime().toString(36); // TODO: Miksi juuri 36?
    const randomPart = Math.random().toString(36).substring(2); // The two first chars are '0' and '.'.
    return "rid-" + timePart + "-" + randomPart;
}