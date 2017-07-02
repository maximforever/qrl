const database = require("./database");





/* Unit cost*/
/* THIS IS TERRIBLE AND NEEDS TO BE MOVED TO A DB */

var unitCost = {
	"scout": 50,
	"worker": 50,
	"footman": 100,
	"archer": 200
}

function createNewPlayer(db, req, callback){
	if((req.body.name).replace(/\s/g, '').length > 0){    	// let's make sure the input name isn't empty  
		var newPlayer = {
            gameID: null,
            name: req.body.name.toLowerCase(),
        //    email: req.body.email.toLowerCase(), 
            assets: {
            	name: req.body.name.toLowerCase(),
	            stats: {
	                econ_level: 1,
	                military_level: 1
            	},
	            city: {
	                name: "TBD",
	                buildings: {
	                    barracks: 0,
	                    granary: 0,
	                    citadel: {
	                        walls: "wood",
	                        hp: 100,
	                        max_hp: 100
	                    },
	                    walls: {
	                        east: {
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100
	                        },
	                        west: {
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100
	                        },
	                        north: {
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100
	                        },
	                        south: {
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100
	                        }
	                    }
	                }
	            },
	            resources: {
	                coin: {
	                    count: 1000, 
	                    lastUpdated: Date.now()
	                },
	                food: {
	                    count: 0, 
	                    lastUpdated: Date.now()
	                },
	                gems: {
	                    green: {
	                        count: 0, 
	                        lastUpdated: Date.now()
	                    },
	                    red: {
	                        count: 0, 
	                        lastUpdated: Date.now()
	                    },
	                    blue: {
	                        count: 0, 
	                        lastUpdated: Date.now()
	                    }
	                }
	            }
            }
        }

        var scout = {
			type: "scout",
			lastUpdated: Date.now(),
			owner: newPlayer.name,
			job: "none",
			jobMessage: "none",
			id: Date.now()
		}

		// check if player exists in database:

		var playerQuery = {
			name: newPlayer.name
		}

		database.read(db, "player", playerQuery, function(existingPlayer){
			if(existingPlayer.length > 0){												// if this player already exists end here
				console.log("player already exists")
				callback({status: "fail", message: "Player already exists"})
			} else {	
				database.create(db, "player", newPlayer, function(newlyCreatedPlayer){
					createUnit(db, scout, function confirmNewPlayer(newUnit, unitNum){
						callback({status: "success", player: newlyCreatedPlayer[0]})
					});
				});
			}
		})
	} else {
		callback({status: "fail", message: "Name is blank"})
	}
}

function login(db, req, callback){
	if((req.body.name).replace(/\s/g, '').length > 0){    	// let's make sure the input name isn't empty  

		var playerQuery = {
			name: req.body.name
		}	

		database.read(db, "player", playerQuery, function(existingPlayer){
			if(existingPlayer.length == 1){												// if this player exists
				console.log("Logged in successfully.")
				console.log("SETTING COOKIE!");
                req.session.user = existingPlayer[0];
                var day = 60000*60*24;
                req.session.expires = new Date(Date.now() + (30*day));          // this helps the session keep track of the expire date
                req.session.cookie.maxAge = (30*day);                           // this is what makes the cookie expire
                console.log("The cookie set is: ");
                console.log(req.session.cookie);
                callback({status: "success", message: "Logged in"});
			} else {
				req.session.user = null;
				callback({status: "fail", message: "Login is incorrect"})
			}
		});

	} else {
		callback({status: "fail", message: "Name is blank"})
	}
}

function getGameData(db, req, callback){

	/*
		1. get the players' data, filter our player
		2. get all the units belonging to that player
		3. get 

	*/

	var playerQuery = {
		name: req.session.user.name
	}

	var unitQuery = {
		owner: req.session.user.name
	}

	database.read(db, "player", playerQuery, function(newestPlayerData){
		database.read(db, "unit", unitQuery, function(newestUnitData){

			var updatedData = {
				playerData: newestPlayerData[0].assets,
				unitData: newestUnitData
			}
			callback(updatedData);
		})
	})
}


function buyUnit(db, req, callback){

	if(req.session.user){				// let's make sure the player is logged in
		var playerQuery = {
			name: req.session.user.name
		}


		database.read(db, "player", playerQuery, function(thisPlayer){
			console.log("Player has " + thisPlayer[0].assets.resources.coin.count + " coin");

			if(thisPlayer[0].assets.resources.coin.count >= unitCost[req.body.unit]){

				console.log("got enough coin to buy a " + req.body.unit)

				var newUnit = {
					type: req.body.unit,
					lastUpdated: Date.now(),
					owner: thisPlayer[0].name,
					job: "none",
					jobMessage: "none",
					id: Date.now()
				}

				var count = "resources.coin.count";

				var updatedStats = {
					$inc: {
						"assets.resources.coin.count": - (unitCost[req.body.unit])		// decrease how much coin the player has
					}
				}													

				database.update(db, "player", playerQuery, updatedStats, function confirmUpdatedCoinCount(updatedPlayer){		// this updates player coin count
					console.log("Successfully updated player coin count!");


					createUnit(db, newUnit, function createUnitForPlayer(newUnit, unitNum){

							var updatedPlayerData = {
    							unitCount: unitNum,
    							coinCount: updatedPlayer.assets.resources.coin.count
    						}

    						callback({status: "success", data: updatedPlayerData});
					});
				})
			} else {
				callback({status: "fail", message: "Not enough coin"});
			}
		})
	} else {
		callback({status: "fail", message: "You must be logged in"});
	}
}



function createUnit(db, newUnit, callback){
	database.create(db, "unit", newUnit, function createUnitForPlayer(createdUnit){		// this creates the new unit
		var unitQuery = {
			owner: createdUnit.owner,
			type: newUnit.type
		}

		database.read(db, "unit", unitQuery, function returnNumOfUnits(unitNum){		// this returns how much of that unit the player has
			callback(createdUnit, unitNum.length)
		});
	});
}






module.exports.createNewPlayer = createNewPlayer;
module.exports.login = login;
module.exports.getGameData = getGameData;
module.exports.buyUnit = buyUnit;