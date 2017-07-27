const database = require("./database");
const CYCLE = 1000*60*4; 				// 1 cycle = 12 hours - currently 4 mins
		   // 1000*60*60*12




/* Unit cost*/
/* THIS IS TERRIBLE AND NEEDS TO BE MOVED TO A DB */

var unitCost = {
	"scout": 50,
	"worker": 50,
	"footman": 100,
	"archer": 200
}

var speed = {
	"footman": 3,
	"archer": 8
}


var armor = {
	"footman": 3,
	"archer": 1
}


var str = {
	"footman": 5,
	"archer": 5
}


function soldier(str, armor, speed){
	this.str = str; 
	this.armor = armor;
	this.speed = speed;
}






function createNewGame(db, req, callback){

	if(req.body.gameID == null){
		var newGame = {
			id: Date.now(),
			status: "setup",
			leader: req.session.user.name,
			players: [req.session.user.name]
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
            			status: "free",
	            		size: 0
	            	}, 
	            	two: {
	            		location: "home",
	            		status: "free",
	            		size: 0
	            	},
	            	three: {
	            		location: "home",
	            		status: "free",
	            		size: 0
	            	}
            	},
	            city: {
	                name: null,
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
	                            max_hp: 100,
	                            unit_group: "none"
	                        },
	                        west: {
	                        	name: "Western wall",
	                        	type: "west-wall",
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100,
	                            unit_group: "none"
	                        },
	                        north: {
	                        	name: "Northern wall",
	                        	type: "north-wall",
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100,
	                            unit_group: "none"
	                        },
	                        south: {
	                        	name: "Southern wall",
	                        	type: "south-wall",
	                            material: "wood",
	                            hp: 100,
	                            max_hp: 100,
	                            unit_group: "none"
	                        },
	                        gates: {
	                        	name: "Gates",
	                        	type: "gates",
	                        	unit_group: "none"
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
	            }, notifications: []
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
					notificationData: thisPlayer[0].assets.notifications
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

			if(techAvailable(req.body.unit, thisPlayer[0])){										// let's make sure the tech is available

				if(thisPlayer[0].assets.resources.coin.count >= unitCost[req.body.unit]){			// let's make sure the player has enough money

					var unitQuery = {
						owner: thisPlayer[0].name,
						type: "worker"
					}					

					database.read(db, "unit", unitQuery, function(existingWorkers){

						if(existingWorkers.length < 8 || req.body.unit !== "worker"){				// let's make sure the player has less than 8 workers
							console.log("got enough coin to buy a " + req.body.unit)
							var fightingStats;							// placeholder in case this is a military unit 
							var newUnit = {
								id: Date.now(),
								type: req.body.unit,
								lastUpdated: Date.now(),
								owner: thisPlayer[0].name,
								job: "none",
								hp: 100,
								group: "none"
							}

							/*
								Above, I've created small objects that hold base values for each type of unit, 
								as well as a general soldier constructor
							*/


							if(req.body.unit == "archer" || req.body.unit == "footman"){
								fightingStats = new soldier(str[req.body.unit], armor[req.body.unit], speed[req.body.unit]); 				
								newUnit.stats = fightingStats;																				 
							}
							console.log("--------");
							console.log("here's what the new unit looks like:");
							console.log(newUnit);
							console.log("--------");



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
		database.read(db, "player", {name: req.session.user.name}, function(player){
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
						console.log("HERE!");
						console.log("group: " + req.body.group);
						console.log(player[0].assets.groups);

							if(req.body.current == "none"){
								playerUpdate.$inc["assets.groups." + req.body.group + ".size"] = 1;
							} else {
								playerUpdate.$inc["assets.groups." + req.body.current + ".size"] = -1;
							}

						/*
							This is a mouthful. There are two cases where this should work:
								1. we're moving an unassigned unit into a group that's free
								2. we're moving an assigned unit from a group that's free
						*/

						if((req.body.current == "none" && player[0].assets.groups[req.body.group].status == "free") || (req.body.current != "none" && player[0].assets.groups[req.body.current].status == "free")) {
							database.update(db, "unit", unitQuery, unitUpdate, function sendGroup(groupedUnit){
								database.update(db, "player", {name: req.session.user.name}, playerUpdate , function updatePlayer(updatedPlayer){
									console.log("Unit group is now " + groupedUnit.group)
									callback({status: "success", message: "unit successfully grouped!"});
								})	
							})
						} else {
							callback({status: "fail", message: "This Group is occupied"});
						}

					} else {
						callback({status: "fail", message: "You can't group a dead unit"});
					}
				} else {
					callback({status: "fail", message: "You can only group military units"});
				}
			})		
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


function attackPlayer(db, req, callback){

	/*
		1. check that the user is logged in
		2. check that the opponent is alive
		3. create action and add it to the action queue
	*/

	if(req.session.user){				// let's make sure the player is logged in
		
		var opponentQuery = {
 			name: req.body.name
		}

		database.read(db, "player", opponentQuery, function attackOpponent(opponent){			// get opponent data
			if(opponent[0].assets.city.buildings.citadel.hp > 0){

				var unitQuery = {										// these are all the units in the group we're attacking with
					owner: req.session.user.name,
					group: req.body.group
				}

				database.read(db, "unit", unitQuery, function collectUnits(groupUnits){

					console.log("here are the units in this group:");
					console.log(groupUnits);


					var attack = {
						id: Date.now(),
						from: req.session.user.name,
						to: opponent[0].name,
						type: "attack",
						units: groupUnits,
						notified: false,
						declared: Date.now(),
						expires: (Date.now() + CYCLE)
					}

					var playerUpdate = {
						$set: {
						}
					}

					playerUpdate.$set["assets.groups." + req.body.group + ".status"] = "attacking";

					database.create(db, "action", attack, function addAttack(attack){
						database.update(db, "player", {name: req.session.user.name}, playerUpdate, function confirm(group){

							callback({status: "success"});

						})

					});
				})
			} else {
				callback({status: "fail", message: "This opponent has been defeated"});
			}
		})
	} else {
		callback({status: "fail", message: "You must be logged in"});
	}



}


/* invite/game functions */

function invite(db, req, callback){

	/*
		1. check if the player being invited exists
		2. if exists, create a new entry in the invite db with to, from
	*/


	var playerQuery = {
		name: (req.body.name).toLowerCase()
	}
	if(req.session.user.name != req.body.name){
		database.read(db, "player", playerQuery, function checkIfReal(opponent){

			if(opponent.length == 1){
				console.log("GAME ID: " + opponent[0].gameID);

				if(opponent[0].gameID == "null" || opponent[0].gameID == null){

					var existingInvite = {
						type: 'invite',
						from: req.session.user.name,
						to: req.body.name
					}

					database.read(db, "action", existingInvite, function checkIfInvited(existingInvites){

						if(existingInvites.length == 0){
							
							var newInvite = {
								from: req.session.user.name,
								to: opponent[0].name,
								type: "invite",
								gameID: req.session.user.gameID
							}

							database.create(db, "action", newInvite, function confirmInvite(invite){
								console.log("HERE IS THE INVITE:");
								console.log(invite.ops[0]);
								// again, no idea why ops all of a sudden
								callback({status: "success", message: ("player '" + invite.ops[0].to +  "' has been invited")})
							});
							
						} else {
							callback({status: "fail", message: ("You have already invited '" + (req.body.name).toLowerCase() + "'")})
						}

						
					})

				} else {
					callback({status: "fail", message: ("player '" + (req.body.name).toLowerCase() +  "' is already in a game")});
				}

			} else {
				callback({status: "fail", message: ("player '" + (req.body.name).toLowerCase() +  "' doesn't exists")});
			}

		})
	} else{
		callback({status: "fail", message: ("You can't play with yourself... here")})
	}
}

function getInvites(db, req, callback){

	var inviteQuery = {
		type: "invite",
		to: req.session.user.name
	}

	database.read(db, "action", inviteQuery, function returnInvites(invites){
		console.log("Got " + invites.length + " invites for player " + req.session.user.name);
		callback(invites);
	})
}

function directToGame(db, req, callback){

	database.read(db, "player", {name: req.session.user.name}, function getPlayer(player){
		var gameQuery = {
			id: player[0].gameID
		}

		database.read(db, "game", gameQuery, function getGame(game){
			if(game[0].status == "started"){
				callback({status: "started"});
			} else {
				if(req.session.user.name == game[0].leader){
					callback({status: "invite"});
				} else {
					if (player[0].assets.city.name == "null" || player[0].assets.city.name == null){
						callback({status: "capital"});
					} else {
						callback({status: "waiting"});
					}
				}
			}
		})
	})

	

}

function joinGame(db, req, callback){

	var playerQuery = {name: req.session.user.name}
	var gameQuery = {id: parseInt(req.body.id)}

	var gameUpdate = {
		$push: {
			players: req.session.user.name
		}
	}

	var playerUpdate = {
		$set: {
			gameID: parseInt(req.body.id)
		}
	}

	var inviteQuery = {
		type: "invite",
		to: req.session.user.name,
		gameID: parseInt(req.body.id)

	}

	database.update(db, "player", playerQuery, playerUpdate, function updateGame(player){
		database.read(db, "game", gameQuery, function checkIfAlreadyInGame(game){			// check that this player isn't already in the game
			if(game[0].players.indexOf(req.session.user.name) == -1){
				database.update(db, "game", gameQuery, gameUpdate, function deleteInvite(updatedGame){
					database.remove(db, "action", inviteQuery, function confirmUpdate(response){
						req.session.user.gameID = parseInt(req.body.id);
						callback({status: "success"});
					})
				});
			} else {
				callback({status: "fail", message: "This player is already in this game"});
			}
			
		})
		
	});
}

function nameCity(db, req, callback){

	var playerQuery = {name: req.session.user.name}
	var playerUpdate = {
		$set: {
			"assets.city.name": req.body.name
		}
	}

	database.update(db, "player", playerQuery, playerUpdate, function confirm(updatedPlayer){
		callback({status: "successful"});
	})
}

function startGame(db, req, callback){

	var playerQuery = {name: req.session.user.name}

	database.read(db, "player", playerQuery, function updateGame(player){
		var gameQuery = {id: player[0].gameID}
		var gameUpdate = {
			$set: {
				status: "started"
			}
		}

		database.read(db, "game", gameQuery, function updateGame(game){

			if(game[0].players.length > 1){
				database.update(db, "game", gameQuery, gameUpdate, function confirm(updatedPlayer){
					callback({status: "success"});
				})

			} else {
				callback({status: "fail", message: "You can't start a game by yourself. Invite friends!"});
			}



		})
	})
}




/* misc */


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




module.exports.createNewPlayer = createNewPlayer;
module.exports.login = login;
module.exports.getGameData = getGameData;
module.exports.buyUnit = buyUnit;
module.exports.build = build;
module.exports.assignWorker = assignWorker;
module.exports.groupUnit = groupUnit;
module.exports.attackPlayer = attackPlayer;
module.exports.createNewGame = createNewGame;
module.exports.getInvites = getInvites;
module.exports.directToGame = directToGame;
module.exports.invite = invite;
module.exports.joinGame = joinGame;
module.exports.nameCity = nameCity;
module.exports.startGame = startGame;
module.exports.apocalypse = apocalypse;
