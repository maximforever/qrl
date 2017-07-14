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
	                    barracks: {
	                    	name: "Barracks",
	                    	type: "barracks",
	                    	built: false,
	                    	level: 0,
	                    	hp: 0,
	                    	max_hp: 200,
	                    	cost: 300
	                    },
	                    granary: {
	                    	name: "Granary",
	                    	type: "granary",
	                    	built: false,
	                    	level: 0,
	                    	hp: 0,
	                    	max_hp: 300,
	                    	max_food: 0,
	                    	cost: 500
	                    },
	                    citadel: {
	                    	name: "Citadel",
	                    	type: "citadel",
	                    	built: true,
	                        walls: "wood",
	                        hp: 100,
	                        level: 1,
	                        max_hp: 100
	                    },
	                    walls: {
	                    	built: true,
	                        east: {
	                        	name: "Eastern wall",
	                        	type: "east-wall",
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100
	                        },
	                        west: {
	                        	name: "Western wall",
	                        	type: "west-wall",
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100
	                        },
	                        north: {
	                        	name: "Northern wall",
	                        	type: "north-wall",
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100
	                        },
	                        south: {
	                        	name: "Southern wall",
	                        	type: "south-wall",
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

        var scout = {						/* this is a one-off unit spawn because the player hasn't logged in yet*/
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
		1. get the players, filter our player
		2. get all the units belonging to that player
		3. get actions

	*/

	var playerQuery = {}				// we want this to be empty - want to get all the players	
										// EVENTUALLY, WE'LL WANT GAME ID TO BE EQUAL					

	var unitQuery = {
		owner: req.session.user.name
	}

	database.read(db, "player", playerQuery, function(newestPlayerData){
		database.read(db, "unit", unitQuery, function(newestUnitData){

			thisPlayer = newestPlayerData.filter(function(pl){         // this is how we get from all players to our player
                return pl.name == req.session.user.name
            })

            otherPlayers = newestPlayerData.filter(function(pl){         
                return pl.name != req.session.user.name
            })

            console.log("thisPlayer: ");
            console.log(thisPlayer);

			var updatedData = { 
				playerData: thisPlayer[0].assets,
				unitData: newestUnitData,
				opponentData: otherPlayers
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
			console.log(req.body.unit + " costs " + unitCost[req.body.unit]);

			if(techAvailable(req.body.unit, thisPlayer[0])){
				if(thisPlayer[0].assets.resources.coin.count >= unitCost[req.body.unit]){

					console.log("got enough coin to buy a " + req.body.unit)

					var newUnit = {
						type: req.body.unit,
						lastUpdated: Date.now(),
						owner: thisPlayer[0].name,
						job: "none",
						jobMessage: "none",
						hp: 100,
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

	    						callback({status: "success", data: updatedPlayerData, message: "", error: ""});
						});
					})
				} else {
					callback({status: "fail", message: "Not enough coin"});
				}
			} else {
				callback({status: "fail", message: "You can't build these yet."});
			}
		})
	} else {
		callback({status: "fail", message: "You must be logged in"});
	}
}

function build(db, req, callback){

	if(req.session.user){				// let's make sure the player is logged in
		var playerQuery = {
			name: req.session.user.name
		}

		database.read(db, "player", playerQuery, function(thisPlayer){

			var construction = thisPlayer[0].assets.city.buildings[req.body.building];


			console.log("Player has " + thisPlayer[0].assets.resources.coin.count + " coin");
			console.log("Building costs " + construction.cost);

			if(!construction.built){
				if(thisPlayer[0].assets.resources.coin.count >= construction.cost){
					console.log("got enough coin to buy a " + req.body.building)
					var count = "resources.coin.count";

					var updatedStats = {
						$inc: {
							"assets.resources.coin.count": - construction.cost,		// decrease how much coin the player has
						}
					}													

					database.update(db, "player", playerQuery, updatedStats, function confirmUpdatedCoinCount(updatedPlayer){		// this updates player coin count
						console.log("Successfully updated player coin count!");

						var hp = ("assets.city.buildings." + [req.body.building] + ".hp").toString();
						var built = ("assets.city.buildings." + [req.body.building] + ".built").toString();
						var lvl = ("assets.city.buildings." + [req.body.building] + ".level").toString();




						var updatedBuilding = {
							$set: {
	/*							hp: construction.max_hp,
								built: true*/
							}
						}	

						updatedBuilding.$set[hp] = construction.max_hp;
						updatedBuilding.$set[built] = true;
						updatedBuilding.$set[lvl] = 1;

						database.update(db, "player", playerQuery, updatedBuilding, function confirmUpdatedBuilding(updatedPlayer){
	    					callback({status: "success", message: "", error: ""});
						});
					})
				} else {
					callback({status: "fail", message: "Not enough coin"});
				} 
			} else {
				callback({status: "fail", message: ("You already built a " + construction.type) });
			}
		})
	} else {
		callback({status: "fail", message: "You must be logged in"});
	}
};

function assignWorker(db, req, callback){

	if(req.session.user){				// let's make sure the player is logged in

		var playerQuery = {
			name: req.session.user.name
		}

		database.read(db, "player", playerQuery, function(thisPlayer){

			var unitQuery = {
				id: parseInt(req.body.id)
			}

			database.read(db, "unit", unitQuery, function(thisUnit){
				
				if(thisUnit[0] && thisUnit[0].hp > 0){
					console.log("this is a real unit!");

						var updatedStats = {
							$set: {
								job: req.body.job,
								lastUpdated: Date.now()
							}
						}													

						database.update(db, "unit", unitQuery, updatedStats, function confirmUpdatedUnit(updatedUnit){
							console.log("Unit job is now " + updatedUnit.job)
							callback({status: "success", message: "unit successfully updated!"});
						});	
				} else {
					callback({status: "fail", message: "This unit does not exist or has died"});
				}
			});

		});

	} else {
		callback({status: "fail", message: "You must be logged in"});
	}
};



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


function apocalypse(db, callback){
	database.remove(db, "player", {}, function(){
		database.remove(db, "unit", {}, function(){
			database.remove(db, "action", {}, function(){
				callback();
			})
		})
	})
}

function techAvailable(unit, player){						// check if we have the right building to create this unit
	console.log("testing unit " + unit);

	if(unit == "footman" || unit == "archer"){
		if(player.assets.city.buildings.barracks.built){
			console.log("You have a barracks");
			return true;
		} else {
			console.log("Build a barracks");
			return false;
		}


	}



	return true;				// false if we don't
}



module.exports.createNewPlayer = createNewPlayer;
module.exports.login = login;
module.exports.getGameData = getGameData;
module.exports.buyUnit = buyUnit;
module.exports.build = build;
module.exports.assignWorker = assignWorker;
module.exports.apocalypse = apocalypse;