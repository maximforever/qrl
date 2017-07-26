$(document).ready(main);


function main(){
    console.log("Game actions are up");

    getUpdatedInfo();

    var gameLoop = setInterval(function(){
    	getUpdatedInfo();
    }, 10000);		// let's fetch new data every, eh, 10 seconds


    function getUpdatedInfo(){	                      /* All the info we need to update a player's screen */
    	$.ajax({
                type: "GET",
                contentType: "application/json",
                dataType: "json",
                url: "/game-info",
                success: function(newData){

                //	console.log(newData);                        // this is the update data we're receiving

                	player = newData.playerData;
                	units = newData.unitData;
                    opponents = newData.opponentData;

                    scouts = units.filter(function(el){         // this is how we get from all units to individual units
                        return el.type == "scout"
                    })

                    footmen = units.filter(function(el){
                        return el.type == "footman"
                    })

                    archers = units.filter(function(el){
                        return el.type == "archer"
                    })

                    workers = units.filter(function(el){
                        return el.type == "worker"
                    })

                    /*buildings: */

                    Object.keys(player.city.buildings).forEach(function(bldg){          // this is a way to cycle through JSON
                        building = player.city.buildings[bldg];                         // this returns each individual object name (ex: "granary")
                        if(building.built){                                       // player.city.buildings[bldg] gives us the actual object
                            $("#" + building.type).show();
                            $("#" + building.type).find(".name").text(building.name);
                            $("#" + building.type).find(".level").text(building.level);
                            $("#" + building.type).find(".hp").text(building.hp);
                            $("#" + building.type).find(".max-hp").text(building.hp);
                        }

                    })



                    $("#citadel-walls").text(player.city.buildings.citadel.walls)

                    $("#city-name").text(player.city.name)
                    $("#player-name").text(player.name);
                    $("#coin").text(player.resources.coin.count);
                    $("#food").text(player.resources.food.count);

                    $("#scout-count").text(scouts.length);
                    $("#scout-lvl").text(player.city.buildings.barracks.level);

                    $("#footman-count").text(footmen.length);
                    $("#footman-lvl").text(player.city.buildings.barracks.level);

                    $("#archer-count").text(archers.length);
                    $("#archer-lvl").text(player.city.buildings.barracks.level);

                    $("#worker-count").text(workers.length);
                    $("#worker-lvl").text(player.city.buildings.granary.level);


                    /* opponents */

                    $(".opponents").empty();

                    if(opponents.length > 0 ){
                        opponents.forEach(function(enemy){           //
                            $(".opponents").append("<span id=" + enemy.name + ">"+enemy.name + "</span>");
                            $("#" + enemy.name).append("<button class = 'actions' data-opponent = '" + enemy.name + "'>Actions</button><br>");              
                        });
                    } else {
                        $(".opponents").append("<p>You don't have anyone to play with :*( Get some friends!</p>")
                    }
                    


                }
            })
    }

    $("body").on("click", ".buy-button", function(){

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
                   /* console.log("boom. bought a " + selectedUnit +  ". buying people is rad!");
                    var unitCountSelector = "#" + selectedUnit + "-count";
                    $(unitCountSelector).text(result.unitCount).css("color", "blue");
                    $("#coin").text(result.data.coinCount).css("color", "blue");
*/
                    /* Alteratively: */

                    getUpdatedInfo();
                    $("#coin").css("color", "blue");
                    setTimeout(function(){                          // keep the coins blue for 5 seconds
                        $("#coin").css("color", "black");
                    }, 5000)
                } else {
                    $("#error").text(result.message);
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

        $(".popup").css("display", "block");


        $.ajax({
            type: "get",
            url: "/build",
            success: function(result){
                $("#popup-content").empty();
                $("#popup-content").append(result);
            }
        })
    });

    $("body").on("click", ".buy-units", function(){

        console.log("clicked to buy units!");
        $(".popup").show();

        $.ajax({
            type: "get",
            url: "/buy-units",
            success: function(result){
                $("#popup-content").empty();
                $("#popup-content").append(result);
            }
        })
    });

    $(".workers").click(function(){

        $(".popup").show();

        $.ajax({
            type: "get",
            url: "/assign",
            success: function(result){
                $("#popup-content").empty();
                $("#popup-content").append(result);
            }
        })
    });

    $(".group").click(function(){

        $(".popup").show();

        $.ajax({
            type: "get",
            url: "/group",
            success: function(result){
                $("#popup-content").empty();
                $("#popup-content").append(result);
            }
        })
    });

    $("body").on("click", ".assign", function(){ 

        var unitId = $(this).data("id");
        var unitGroup = $(this).data("group");
        var currentGroup = $(this).data("current");

        var data = {
            id: unitId,
            group: unitGroup,
            current: currentGroup
        }

        console.log("Packaged data:");
        console.log(data);

        $.ajax({
            type: "post",
            url: "/group",
            data: data,
            success: function(result){
               if(result.status == "success"){
                    console.log("successfully grouped unit");
                    getUpdatedInfo();
                    $.ajax({
                        type: "get",
                        url: "/group",
                        success: function(result){
                            console.log("successfully fetched updated data");
                            $("#popup-content").empty();
                            $("#popup-content").append(result);
                        }
                    })
                } else {
                    $("#error").text(result.message);
                }
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
                    getUpdatedInfo();
                    $.ajax({
                        type: "get",
                        url: "/build",
                        success: function(result){
                            $("#popup-content").empty();
                            $("#popup-content").append(result);
                        }
                    })
                } else {
                    $("#error").text(result.message);
                }
            }
        })
    });

    $("body").on("click", ".assign-worker", function(){

        workerId = $(this).data("id");
        workerJob = $(this).data("job");

        var workerData = {
            id: workerId,
            job: workerJob
        }

        $.ajax({
            type: "post",
            url: "/assign",
            data: workerData,
            success: function(result){
               if(result.status == "success"){
                    getUpdatedInfo();
                    $.ajax({
                        type: "get",
                        url: "/assign",
                        success: function(assignResult){
                            $("#popup-content").empty();
                            $("#popup-content").append(assignResult);
                        }
                    })
                } else {
                    $("#error").text(result.message);
                }
            }
        })
    });


    $("body").on("click", ".actions", function(){


        var enemyName = $(this).data("opponent");

        var enemyData = {
            name: enemyName,
        }

        $.ajax({
            type: "get",
            url: "/actions",
            data: enemyData,
            success: function(result){
                $(".popup").show();
                $("#popup-content").empty();
                $("#popup-content").append(result);
            }
        })
    });


    /* attack opponent*/


    $("body").on("click", ".attack-player", function(){

        console.log("clicked!");

        var thisEnemy = $(this).data("opponent");
        var thisGroup = $(this).data("group");

        var attackData = {
            name: thisEnemy,
            group: thisGroup
        }

        var enemyData = {
            name: thisEnemy,
        }

        $.ajax({
            type: "post",
            url: "/attack-player",
            data: attackData,
            success: function(result){
                getUpdatedInfo();
                $.ajax({
                    type: "get",
                    url: "/actions",
                    data: enemyData,
                    success: function(result){
                        $(".popup").show();
                        $("#popup-content").empty();
                        $("#popup-content").append(result);
                    }
                })
            }
        })

    });



    $(document).keyup(function(e) {                             // close on ESC
      if (e.keyCode === 27) $('#close').click();
    });




    $("#close").click(function(){                               // close the popup
        $(".popup").css("display", "none    ");
    })
   


    /* Display stuff */


    $(".tile").click(function(){

        var thisScreen = $(this).attr("data-type");
        $(".screen").hide();
        $("#"+thisScreen).show();
        
    })

}