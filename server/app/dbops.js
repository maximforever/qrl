const database = require("./database");





/* Unit cost*/
/* THIS IS TERRIBLE AND NEEDS TO BE MOVED TO A DB */

var unitCost = {
	"scout": 50,
	"worker": 50,
	"footman": 100,
	"archer": 200
}


function createNewGame(db, req, callback){

	newGameMap = createMap(db, req, function createGame(mapForGame){

		if(req.body.gameID == null){
			var newGame = {
				id: Date.now(),
				status: "setup",
				leader: req.session.user.name,
				players: [req.session.user.name],
				map: mapForGame.map
			}

			database.create(db, "game", newGame, function(createdGame){												// create new game in DB
				console.log("Created Game: ");
				console.log(createdGame.ops[0]);			// no idea why we need to do this here instead of just createdGame[0] as we would everywhere else
				var gameUpdate = {$set: {
					gameID: createdGame.ops[0].id,
					"assets.city.name": req.body.capital
				}}

				req.session.user.gameID = createdGame.ops[0].id;

				database.update(db, "player", {name: newGame.leader}, gameUpdate, function(updatedPlayer){			// set leader gameID to the newly created game ID
					callback({status: "success", game: createdGame})

				})	
			})

		} else {
			callback({status: "fail", message: "Already in a game"})
		}

	});
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
            	allies: [],
            	groups:{
            		one: {
            			location: "home",
	            		size: 0
	            	}, 
	            	two: {
	            		location: "home",
	            		size: 0
	            	},
	            	three: {
	            		location: "home",
	            		size: 0
	            	}
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


	var playerQuery = {
		gameID: req.session.user.gameID
	}								

	var unitQuery = {
		owner: req.session.user.name
	}

	var gameQuery = {
		id: req.session.user.gameID
	}

	database.read(db, "player", playerQuery, function(newestPlayerData){
		database.read(db, "unit", unitQuery, function(newestUnitData){
			database.read(db, "game", gameQuery, function(newestGameData){

				console.log("NewestGameData:");
				console.log(newestGameData);


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
					opponentData: otherPlayers,
					map: newestGameData[0].map
				}
				callback(updatedData);
			})
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

					var unitQuery = {
						owner: thisPlayer[0].name,
						type: "worker"
					}					

					database.read(db, "unit", unitQuery, function(existingWorkers){

						if(existingWorkers.length < 8 || req.body.unit !== "worker"){
							console.log("got enough coin to buy a " + req.body.unit)
							var newUnit = {
								type: req.body.unit,
								lastUpdated: Date.now(),
								owner: thisPlayer[0].name,
								job: "none",
								jobMessage: "none",
								hp: 100,
								group: "none",
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
							callback({status: "fail", message: "You can't have more than 8 workers"});
						} 
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


function groupUnit(db, req, callback){

	if(req.session.user){				// let's make sure the player is logged in
		
		var unitQuery = {
			id: parseInt(req.body.id)
		}

		database.read(db, "unit", unitQuery, function getUnit(unit){
			unit = unit[0];
			if(unit.type == "footman" || unit.type == "archer"){
				if(unit.hp > 0){

					var unitUpdate = {
						$set: {
							group: req.body.group
						}
					}

					var playerUpdate = {
						$inc: {
						}
					}

					if(req.body.current == "none"){
						playerUpdate.$inc["assets.groups." + req.body.group + ".size"] = 1;
					} else {
						playerUpdate.$inc["assets.groups." + req.body.current + ".size"] = -1;
					}

					database.update(db, "unit", unitQuery, unitUpdate, function sendGroup(groupedUnit){
						database.update(db, "player", {name: req.session.user.name}, playerUpdate , function updatePlayer(updatedPlayer){
							console.log("Unit group is now " + groupedUnit.group)
							callback({status: "success", message: "unit successfully grouped!"});
						})	
					})


				} else {
					callback({status: "fail", message: "You can't group a dead unit"});
				}
			} else {
				callback({status: "fail", message: "You can only group military units"});
			}
		})
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
				database.remove(db, "game", {}, function(){
					callback();
				});
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

/* create map */

function createMap(db, req, callback){

	if(req.session.user){				// let's make sure the player is logged in

		console.log("making new map!");

		newMap = [[],[],[],[],[],[],[],[],[],[]]				// 10 x 10 map

		var height = 10;
		var width = 10;
		var roll;



		for(var i=0; i < width; i++){
			for(var j=0; j < height; j++){

				roll = Math.random();


				if(roll < 0.3){
					mapType = "water";
				} else {
					mapType = "grass";
				}



				newMap[j][i] ={
					type: mapType,
					x: i,
					y: j,
					unit: null,
					city: null
				};
				console.log("Made tile [" + i + ", " + j + "]");
			}
		}

		callback({status: "success", map: newMap})

	} else {
		callback({status: "fail", message: "You must be logged in"});
	}
};






module.exports.createNewPlayer = createNewPlayer;
module.exports.login = login;
module.exports.getGameData = getGameData;
module.exports.buyUnit = buyUnit;
module.exports.build = build;
module.exports.assignWorker = assignWorker;
module.exports.groupUnit = groupUnit;
module.exports.createMap = createMap;
module.exports.createNewGame = createNewGame;
module.exports.apocalypse = apocalypse;
