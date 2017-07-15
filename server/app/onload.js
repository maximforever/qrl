const database = require("./database");
const dbops = require("./dbops");


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