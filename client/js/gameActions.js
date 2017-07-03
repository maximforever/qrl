$(document).ready(main);


function main(){
    console.log("Game actions are up");

    getUpdateInfo();

    var gameLoop = setInterval(function(){
    	getUpdateInfo()
    }, 5000);		// let's fetch new data every, eh, 5 seconds


    function getUpdateInfo(){	                      /* All the info we need to update a player's screen */
    	$.ajax({
                type: "GET",
                contentType: "application/json",
                dataType: "json",
                url: "/game-info",
                success: function(newData){

                	console.log(newData);                        // this is the update data we're receiving

                	player = newData.playerData;
                	units = newData.unitData;

                    scouts = units.filter(function(el){         // this is how we get from all units to individual units
                        return el.type == "scout"
                    })

                    footmen = units.filter(function(el){
                        return el.type == "footman"
                    })

                    /*buildings: */

                    Object.keys(player.city.buildings).forEach(function(bldg){          // this is a way to cycle through JSON
                        building = player.city.buildings[bldg];                         // this returns each individual object name (ex: "granary")
                        if(building.built){                                       // player.city.buildings[bldg] gives us the actual object
                            console.log("got a " + building.type);
                            $("#" + building.type).show();
                            $("#" + building.type).find(".name").text(building.name);
                            $("#" + building.type).find(".level").text(building.level);
                            $("#" + building.type).find(".hp").text(building.hp);
                            $("#" + building.type).find(".max-hp").text(building.hp);
                        }

                    })



                    $("#citadel-walls").text(player.city.buildings.citadel.walls)


                    console.log("Received a response from the server.");
                    $("#city-name").text(player.city.name)
                    $("#player-name").text(player.name);
                    $("#scout-count").text(footmen.length);
                    $("#coin").text(player.resources.coin.count);

                }
            })
    }

    $(".buy-button").click(function(){

        var selectedUnit =  $(this).attr("id");
        console.log("Gonna try to buy a " + selectedUnit);

        var body = {
            action: "buy",
            unit: selectedUnit
        }

        $.ajax({
            type: "post",
            url: "/buy-unit",
            data: body,
            success: function(result){
                $(".unit").css("color", "black");
                if(result.status == "success"){
                    console.log("boom. bought a " + selectedUnit +  ". buying people is rad!");
                    var unitCountSelector = "#" + selectedUnit + "-count";
                    $(unitCountSelector).text(result.unitCount).css("color", "blue");
                    $("#coin").text(result.data.coinCount).css("color", "blue");

                    /* Alteratively: */

                    getUpdateInfo();
                } else {
                    $(".error").text(result.message);
                    $("#coin").css("color", "red");
                }
            }
        })
    });

    /* Build stuff */

    $(".build").click(function(){

        /*
            1. figure out what building was clicked
            2. send ajax request to build this
            3. if successful, display building, decrease money
        */

        $(".popup").toggle();


        $.ajax({
            type: "get",
            url: "/build",
            success: function(result){
                $("#popup-content").empty();
                $("#popup-content").append(result);
            }
        })
    });

    $("body").on("click", ".build-action", function(){ 

        var bldg = $(this).attr("id");

        var body = {
            building: bldg
        }

        $.ajax({
            type: "post",
            url: "/build",
            data: body,
            success: function(result){
               if(result.status == "success"){
                    $(".popup").hide();
                    getUpdateInfo();
                } else {
                    $(".error").text(result.message);
                }
            }
        })
    });




    $("#close").click(function(){               /* closes the popup*/
        $(".popup").hide();
    })
   


    /* Display stuff */


    $(".tile").click(function(){

        var thisScreen = $(this).attr("data-type");
        $(".screen").hide();
        $("#"+thisScreen).show();

    })

}