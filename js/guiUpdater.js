"use strict";

const guiUpdater = {};
(function(c) {

    c.updatePlayerInfo = function(){
        const currentPlayer = turnService.currentPlayer;
        console.log("player name:", currentPlayer.name);
        $('#player-info-div-name').text(currentPlayer.name);
        $('#player-info-div-color').css({backgroundColor: currentPlayer.color});
        $('#player-info-div-resources').text(""+currentPlayer.money);
    };

}(guiUpdater));