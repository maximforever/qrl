$(document).ready(main);


function main(){
    console.log("Game actions are up");

    getUpdateInfo();
    var gameLoop = setInterval(function(){
    	getUpdateInfo()
    }, 5000);		// let's fetch new data every, eh, 5 seconds


    function getUpdateInfo(){	
    	$.ajax({
                type: "GET",
                contentType: "application/json",
                dataType: "json",
                url: "/game-info",
                success: function(newData){

                	console.log(newData);

                	player = newData.playerData;
                	units = newData.unitData;
                    console.log("Received a response from the server.");
                    $("#player-name").text(player.name);
                    $("#coin").text(player.resources.coin.count);

                }
            })
    }

    $(".buy-button").click(function(){

        var selectedUnit =  $(this).attr("id");
        console.log("Gonna try to buy a " + selectedUnit);

        var action = {
            action: "buy",
            unit: selectedUnit
        }

        $.ajax({
            type: "post",
            url: "/buy-unit",
            data: action,
            success: function(result){
                $(".unit").css("color", "black");

                console.log(result);


                if(result.status == "success"){
                    console.log("boom. bought a " + selectedUnit +  ". buying people is rad!");
                    var unitCountSelector = "#" + selectedUnit + "-count";
                    $(unitCountSelector).text(result.unitCount).css("color", "blue");
                    $("#coin").text(result.data.coinCount).css("color", "blue");
                } else {
                    $(".error").text(result.message);
                    $("#coin").css("color", "red");
                }
            }
        })
    });

}