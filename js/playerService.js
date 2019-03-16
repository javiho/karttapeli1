"use strict";

const playerService = {};
(function(c) {
    // c stands for context.
    c.players = null; // Array of Player objects.
    // c.currentPlayer = null; // TODO: tämä voisi kuulua vuoromanageriin.

    c.initializePlayerData = function(){
        c.players = playerService.getInitialPlayerData();
        // c.currentPlayer = c.players[0]; -> vuoromanageriin
    };

    c.getInitialPlayerData = function(){
        const players = [
            new c.Player(8, "player1", "green"),
            new c.Player(9, "player2", "gold"),
            new c.Player(10, "player3", "aliceblue"),
        ];
        return players;
    };

    /*
        Pre-condition: players is an array or Players.
        Return value: the first one in the order of players.
     */
    c.getFirstInOrder = function(players){
        const playersToIndices = new Map();
        for(let i = 0; i < c.players.length; i++){
            for(let j = 0; j < players.length; j++){
                if(c.players[i] === players[j]){
                    playersToIndices.set(players[j], i);
                }
            }
        }
        const playersWithLowestIndex = findKeysWithExtremeValue(playersToIndices, "min");
        console.assert(playersWithLowestIndex.length === 1);
        return playersWithLowestIndex[0];
    };

    c.Player = function(id, name, color){
        this.id = id; // int
        this.name = name; // string
        this.color = color; // string, color's name
    }

})(playerService);