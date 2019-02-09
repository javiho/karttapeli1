"use strict";

const countryService = {};
(function(c) {
    // c stands for context.

    c.Country = function(id, name){
        this.id = id; // int
        this.name = name; // string
        this.owner = null; // Player object
        // at least neighbors will be here, or maybe elsewhere
    }

})(countryService);