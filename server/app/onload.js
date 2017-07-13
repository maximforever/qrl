const database = require("./database");
const dbops = require("./dbops");

function addResources(db){

    /*
        1. find all unit where the job isn't "none"
        2. add 10 to the onwer's corresponding resource
        3. update the unit's "last update" 
        3. rewrite code till this works
    */

    var updateInterval = 5;         // in seconds

    var unitQuery = {
        type: "worker",
        job: {
            $ne: "none"
        }           
    }

    // look up all working worker units

    database.read(db, "unit", unitQuery, function allWorkingUnits(units){
        if(units.length > 0){
            console.log("Found " + units.length + " units to process for resources");
            actionCounter = 0;              // forcing synchrony :(
            units.forEach(function(unit){

                console.log("working on " + unit.type + ", id: " + unit.id);
                //look up player for each of these

                var playerQuery = {
                    name: unit.owner
                }

                database.read(db, "player", playerQuery, function queryPlayerForUpdate(player){
                    if(player.length > 0){
                        console.log("this " + unit.type + " belongs to " + player[0].name)

                        //update player's correct resource if it has been 10 seconds

                        var timeSinceLastUpdate = Math.floor(((Date.now() - unit.lastUpdated)/1000))            // need to figure out how much time to add here
                        var updatesDue = Math.floor(timeSinceLastUpdate/updateInterval);
                        var updateAtTime = Date.now() - ((Date.now() - unit.lastUpdated) - (timeSinceLastUpdate)*1000); // this HOPEFULLY gets that remainder between time now and time due for last update.

                        console.log("It has been " + timeSinceLastUpdate + " seconds since the last update. We're due " + updatesDue + " updates.");


                        var resource;

                        console.log("unit job: " + unit.job)

                        if(unit.job == "farmer"){
                            resource = "food";
                        } else if(unit.job == "miner"){
                            resource = "coin";
                        }



                        if(updatesDue > 0){
                            var resourceCount = "assets.resources." + resource + ".count";
                            var playerUpdateQuery = {};                                                  // decrease how much coin the player has
                            var additionalResource = 1*updatesDue;                                        // this is where the magic happens. 
                            console.log("Player:");
                            console.log(player[0]["assets"]["resources"]);

                            playerUpdateQuery[resourceCount] = player[0]["assets"]["resources"][resource]["count"] + additionalResource;      // this is where the magic happens. 
                            


                            // update the player's coin count
                            database.update(db, "player", playerQuery, playerUpdateQuery, function updateResource(updatedPlayer){
                                console.log("success! updated " + playerUpdateQuery.resource + " for player " + updatedPlayer.name);
                                database.update(db, "unit", {id: unit.id}, {lastUpdated: updateAtTime}, function updateUnitTime(updatedUnit){
//                                     console.log("success! updated " + updatedUnit.id);
                                })

                            })
                        }

                    } else {
                        console.log("weird, no such player named " + unit.owner + " for unit id: " + unit.id);
                    }
                });

            });
        } else {
            console.log("No units to process for resources");
        }
    });
};


module.exports.addResources = addResources;