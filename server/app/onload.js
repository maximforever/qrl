const database = require("./database");
const dbops = require("./dbops");

const CYCLE = 1000*60*0.5;

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

    var notificationTime = Date.now() + CYCLE;          

    var date = new Date(notificationTime);
    console.log("Looking for actions that expire before " + date);

    var attackQuery = {
        type: "attack",
        to: req.session.user.name
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
                        winner: null,
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


function resolveAttacks(db,req, callback){

    console.log("RESOLVING ATTACKS!")

    /*
        1. find all attacks against the player where the expires date >= Date.now()
        2. if the attack.to player has a unit at the gate...
            a. get that unit
            b. engage that unit with dbops.battle
        3. if the attack.to player doesn't have a unit at the gate...
            a. engage attack at wall
    */



    var actionQuery = {
        expires: {
            $lte: Date.now()
        }
    }


    database.read(db, "action", actionQuery, function getExpiredAttacks(attacks){
        console.log("attacks:");
        console.log(attacks);
        
        if(attacks.length > 0){
            console.log("Found " + attacks.length + " unresolved attacks for " + req.session.user.name);

            attacks.forEach(function(attack){
                if(attack.from == req.session.user.name || attack.to == req.session.user.name){
                    var attackedPlayer = {
                        name: attack.to
                    }

                    dbops.engage(db, req, attack, function attackResult(response){

                        var notificationBody = response.winnerName + " won a battle against " + response.loserName + " at " + response.city

                        var notificationUpdateQuery = {
                            $push: {
                                "assets.messages": {
                                    body: notificationBody,
                                    timestamp: Date.now()
                                }
                            }
                        }

                        var winnerQuery = {name: response.winnerName}
                        var loserQuery = {name: response.loserName}

                        database.update(db, "player", winnerQuery, notificationUpdateQuery, function updateWinner(winnerResponse){
                            database.update(db, "player", loserQuery, notificationUpdateQuery, function updateLoser(loserResponse){
                                console.log("XXXX Done with action: " + attack.id);
                            })  
                        })

                    })
                }

            })

            callback();

        } else {
            console.log("There are no unresolved attacks");
            callback();
        }

    })
}

function clearNotifications(db, req, callback){
    /* we'll need to turn any battle notifications into resolved won/lost notifications*/

    /*
        1. find all actions where expired <= Date.now()
        2. get the action.TO player data
        3. get the player's notifications
        4. filter them for everything that's NOT that ID
        5. update player
        6. delete action
    */

    var actionQuery = {
        expires: {
            $lte: Date.now()
        },
        to: req.session.user.name
    }

    var playerQuery = {name: req.session.user.name}

    database.read(db, "action", actionQuery, function getAllExpiredActions(actions){
        if(actions.length > 0){
            console.log("Found " + actions.length + " expired actions for " + req.session.user.name);
            database.read(db, "player", playerQuery, function getUpdatedPlayer(player){

                actions.forEach(function(expiredAction){

                    var removeActionQuery = {
                        id: expiredAction.id
                    }

                    var updatedNotifications = player[0].assets.notifications.filter(function(notification){
                        console.log("notification");
                        console.log(notification);
                        console.log("expiredAction");
                        console.log(expiredAction);
                        return notification.action_id != expiredAction.id;
                    })

                    var notificationUpdateQuery = {
                        $set: {
                            "assets.notifications": updatedNotifications
                        }
                    }

                    database.update(db, "player", playerQuery, notificationUpdateQuery, function updateNotification(updatedNotifications){
                        database.remove(db, "action", removeActionQuery, function confirm(response){
                            console.log("Removed action " + expiredAction.id + "!");
                        });
                    })
                })

            })
        } else {
            console.log("There are no expired actions");
            
        }

        callback();
       
    })
}

/* We'll need to expire old actions */



module.exports.addResources = addResources;
module.exports.checkForAttacks = checkForAttacks;
module.exports.clearNotifications = clearNotifications;
module.exports.resolveAttacks = resolveAttacks;