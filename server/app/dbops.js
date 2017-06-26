const database = require("./database");

function createNewPlayer(db, req, res, callback){
	if((req.body.name).replace(/\s/g, '').length > 0){    	// let's make sure the input name isn't empty  
		var newPlayer = {
            gameID: null,
            name: req.body.name.toLowerCase(),
        //    email: req.body.email.toLowerCase(), 
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

		// check if player exists in database:

		var playerQuery = {
			name: newPlayer.name
		}

		database.read(db, "player", playerQuery, res, function(existingPlayer){
			if(existingPlayer.length > 0){												// if this player already exists end here
				console.log("player already exists")
				callback({status: "fail", message: "Player already exists"})
			} else {	
				database.create(db, "player", newPlayer, res, function(newlyCreatedPlayer){
					callback({status: "success", player: newlyCreatedPlayer[0]})
				});
			}
		})
	} else {
		callback({status: "fail", message: "Name is blank"})
	}
}

function login(db, req, res, callback){
	if((req.body.name).replace(/\s/g, '').length > 0){    	// let's make sure the input name isn't empty  

		var playerQuery = {
			name: req.body.name
		}	

		database.read(db, "player", playerQuery, res, function(existingPlayer){
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

function getGameData(db, req, res, callback){

	/*
		1. get the players' data, filter our player
		2. get all the units belonging to that player
		3. get 

	*/

	var playerQuery = {
		name: req.session.user.name
	}

	database.read(db, "player", playerQuery, res, function(newestPlayerData){
		callback(newestPlayerData[0]);
	})



}



module.exports.createNewPlayer = createNewPlayer;
module.exports.login = login;
module.exports.getGameData = getGameData;