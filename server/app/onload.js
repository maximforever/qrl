const database = require("./database");
const dbops = require("./dbops");

const CYCLE = 1000*60*4;

function addResources(db, req, callback){

    /* 
        1. find all units belonging to the player where the job isn't none 
        2. for each unit, divide (now - last updated) by update interval
        3. if the result is > 0, save # of updates and the Remainder
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
            var remainder = 0;
            var resource = null;

            console.log(updatesDue + " updates due for worker " + worker.id);

            if(updatesDue > 0){                                                         // check for the remainder
                remainder = (Date.now() - worker.lastUpdated)%updateInterval;
                console.log("Remainder: " + remainder);
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
                            lastUpdated: (Date.now() - remainder)
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



function checkForAttacks(db, req, callback){

    /*
        1. find all actions with type "attack" against the player where the expiration time is less than HALF CYCLE from now
        2. add a notification based on this attack
    */

    var notificationTime = Date.now() + CYCLE/2;          

    var date = new Date(notificationTime);
    console.log("Looking for actions that expire before " + date);

    var attackQuery = {
        type: "attack",
        to: req.session.user.name,
        expires: {
            $lt: notificationTime
        }
    }

    database.read(db, "action", attackQuery, function attacksAgainstPlayer(attacks){
        console.log("Found " + attacks.length + " attacks that expire before " + date);

        if(attacks.length > 0){

            attacks.forEach(function(attack){

                if(!attack.notified){
                    var newMessage = {   
                        from: attack.from,                
                        action_id: attack.id,
                        expires: attack.expires,
                        type: "attack"
                    }


                    var newMessageUpdate = {
                        $push: {
                            "assets.notifications": newMessage
                        }
                    }

                    var notificationUpdate = {
                        $set: {
                            notified: true
                        }
                    }

                    database.update(db, "player", {name: req.session.user.name}, newMessageUpdate, function confirmMessage(newAttack){
                        database.update(db, "action", {id: attack.id}, notificationUpdate, function confirm(response){
                            console.log("Added attack " + attack.id + " to the player " + req.session.user.name);
                        })
                    })
                } else {
                    console.log("Attack " + attack.id + " is already recorded");
                }
            })
        } else {
            console.log("no attacks to add against " + req.session.user.name)
        }
        callback();
    })
}

function clearNotifications(){
    /* we'll need to turn any battle notifications into resolved won/lost notifications*/
}

/* We'll need to expire old actions */



module.exports.addResources = addResources;
module.exports.checkForAttacks = checkForAttacks;