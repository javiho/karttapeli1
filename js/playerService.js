"use strict";

// This object contains functions for life and the abstraction of it's presentation in the view, if you catch my meaning.
const playerService = {};
(function(c) {
    // c stands for context.
    c.players = null; // Array of Player objects.
    c.currentPlayer = null; // TODO: tämä voisi kuulua vuoromanageriin.

    c.initializePlayerData = function(){
        c.players = playerService.getInitialPlayerData();
        c.currentPlayer = c.players[0];
    };

    c.getInitialPlayerData = function(){
        const players = [
            {id: 8, name: "player1", color: "green"},
            {id: 9, name: "player2", color: "gold"},
            {id: 10, name: "player3", color: "aliceblue"}
        ];
        return players;
    };

})(playerService);