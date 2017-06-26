$(document).ready(main);


function main(){
    console.log("Game actions are up");

    getUpdateInfo();
    var gameLoop = setInterval(getUpdateInfo(), 5000);		// let's fetch new data every, eh, 5 seconds


    function getUpdateInfo(){	
    	$.ajax({
                type: "GET",
                contentType: "application/json",
                dataType: "json",
                url: "/game-info",
                success: function(player){
                    console.log("Received a response from the server.");
                    $("#player-name").text(player.name);
                }
            })
    }


}