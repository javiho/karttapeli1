"use strict";

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
            new c.Player(8, "player1", "green"),
            new c.Player(9, "player2", "gold"),
            new c.Player(10, "player3", "aliceblue"),
        ];
        return players;
    };

    c.Player = function(id, name, color){
        this.id = id; // int
        this.name = name; // string
        this.color = color; // string, color's name
    }

})(playerService);