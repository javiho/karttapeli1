"use strict";

// This object contains functions for life and the abstraction of it's presentation in the view, if you catch my meaning.
const turnService = {};
(function(c) {
    // c stands for context.
    c.Phases = {maneuver: "maneuver", battle: "battle", taxation: "taxation"};
    const defaultPhase = c.Phases.maneuver;

    c.currentTurn = 0;
    c.currentPhase = defaultPhase; // Phases
    c.currentPlayer = null; // Player

    c.initializeTurnData = function(){
        const firstPlayer = playerService.getFirstInOrder(playerService.players);
        console.assert(firstPlayer instanceof playerService.Player);
        c.currentPlayer = firstPlayer;
    };

    c.advanceToNextPhase = function(){
        if(c.currentPhase === c.Phases.maneuver){
            c.currentPhase = c.Phases.battle;
            dispatchCustomEvent("phaseChanged");
        }else if(c.currentPhase === c.Phases.battle){
            c.currentPhase = c.Phases.taxation;
            dispatchCustomEvent("phaseChanged");
        }else{
            // If we are already in the final phase, advance to the next turn instead, which fires the events.
            advanceToNextTurn();
        }
    };

    c.advanceToNextPlayer = function(){
        const currentPlayerIndex = playerService.players.findIndex(player => player === c.currentPlayer);
        console.assert(currentPlayerIndex > -1);
        if(currentPlayerIndex === playerService.players.length - 1){
            c.currentPlayer = playerService.players[0];
        }else{
            c.currentPlayer = playerService.players[currentPlayerIndex + 1];
        }
        dispatchCustomEvent("currentPlayerChanged");
    };

    const advanceToNextTurn = function(){
        c.currentTurn += 1;
        c.currentPhase = defaultPhase;
        c.currentPlayer = playerService.players[0];
        countryService.resetCountriesForNewTurn();
        dispatchCustomEvent("turnChanged");
        dispatchCustomEvent("phaseChanged");
        dispatchCustomEvent("currentPlayerChanged");
    };

})(turnService);