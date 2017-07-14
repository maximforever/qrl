const database = require("./database");
const dbops = require("./dbops");

function addResource(db, callback){

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
                                        callback();
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




function addResources(db, req, callback){

    /* 
        1. find all units belonging to the player where the job isn't none 
        2. for each unit, divide (now - last updated) by update interval
        3. if the result is > 0, save # of updates and the remainder
        4. increase appropriate resource for owner by 1 times # of updates
        5. new lastUpdated = now - remainder
    */

    var updateInterval = 5000;         // in ms
    var resourceCapacity = 1;

    var unitQuery = {                                           // get all the units for this player that are working and are assigned
        owner: req.session.user.name,
        type: "worker",
        job: {
            $ne: "none"
        }   
    }

    database.read(db, "unit", unitQuery, function assignedWorkers(workers){

        console.log("Workers found: " + workers.length);

        workers.forEach(function checkForResources(worker){                 // for each worker....

            var updatesDue = Math.floor((Date.now() - worker.lastUpdated)/updateInterval);
            var remainer = 0;
            var resource = null;

            console.log(updatesDue + " updates due for worker " + worker.id);

            if(updatesDue > 0){                                                         // check for the remainder
                remainer = (Date.now() - worker.lastUpdated)%updateInterval;
                console.log("Remainder: " + remainer);
                var gatheredResources = resourceCapacity*updatesDue;

                switch(worker.job){
                    case "miner":
                        resource = "coin";
                        break;
                    case "farmer":
                        resource = "food"
                        break;
                    default:
                        resource = null;
                }

                console.log("Adding " + gatheredResources + " " + resource);

                var playerResource = "assets.resources." + resource + ".count";

                var playerQuery = {
                    name: req.session.user.name
                }

                var playerUpdateQuery = {           // leaving this blank to define for specific resource
                    $inc: {
                    }
                }

                playerUpdateQuery.$inc[playerResource] = gatheredResources;     // ex: assets.resources.food.count: 150


                database.update(db, "player", playerQuery, playerUpdateQuery, function updateUnitRecord(){

                    var workerQuery = {
                        id: worker.id
                    }

                    var workerUpdateQuery = {
                        $set: {
                            lastUpdated: (Date.now() - remainer)
                        }
                    }

                    database.update(db, "unit", workerQuery, workerUpdateQuery, function confirm(unit){
                        console.log("Unit " + worker.id + " updated!");
                    })
                });
            }

        });

        callback();
    });


}


module.exports.addResources = addResources;