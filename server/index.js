
/* dependencies */
const http = require("http");
const fs = require("fs");                               // file system
const path = require("path");                           // access paths
const express = require("express");                     // express
const MongoClient = require('mongodb').MongoClient;     // talk to mongo
const bodyParser = require('body-parser');              // parse request body
var session = require('express-session')                // create sessions

var secretString = Date.now().toString();

const app = express();
app.set("port", process.env.PORT || 3000)               // we're gonna start a server on whatever the environment port is or on 3000
app.set("views", path.join(__dirname, "../client/views"));        // tells us where our views are
app.set("view engine", "ejs");                          // tells us what view engine to use

app.use(express.static('client'));         // sets the correct views for the CSS file/generally accessing files



const dbops = require("./app/dbops");
const database = require("./app/database");
const onload = require("./app/onload");

if(process.env.LIVE){                                                                           // this is how I do config, folks. put away your pitforks, we're all learning here.
    dbAddress = "mongodb://" + process.env.MLAB_USERNAME + ":" + process.env.MLAB_PASSWORD + "@ds031551.mlab.com:31551/qrl";
} else {
    dbAddress = "mongodb://localhost:27017/qrl";
}


MongoClient.connect(dbAddress, function(err, db){
    if (err){
        console.log("MAYDAY! MAYDAY! Crashing.");
        return console.log(err);
    }

    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(bodyParser.json());                         // for parsing application/json

    app.use(session({                                   // I THINK we only need to do this once, because it's causing us to send 2 GET requests to '/'
        secret: secretString,
        saveUninitialized: false,
        resave: false,
        secure: false,
        cookie: {}
    }));

    app.use(function(req, res, next){                                           // logs request URL
        var timeNow = new Date();
        console.log("-----> " + req.method.toUpperCase() + " " + req.url + " on " + timeNow);  
        console.log("Session: ");
        console.log(app.session);
        console.log("---");
        next();
    });

    app.use(function(req, res, next) {                                          
        app.locals.session = req.session;                                       // makes session available to all views
        app.locals.error = req.session.error;                                   // making copies like this is clunky, but it works
        app.locals.message = req.session.message;
        req.session.error = null;
        req.session.message = null;
        next();
    })


/* ROUTES */

    app.get("/", function(req, res){
        res.render("index");
    })


    app.get("/signup", function(req,res){
        res.render("signup")
    })

    /* CREATE NEW PLAYER */
    app.post("/signup", function(req, res){  
        dbops.createNewPlayer(db, req, function tryToSignup(response){        
            if(response.status == "fail"){
                res.render("signup", {error: response.message});
            } else if(response.status == "success"){
                req.session.user = null;
                req.session.expires = new Date(Date.now);       /* not sure if this is needed */
                res.redirect("/login");
            } else {
                res.render("signup", {error: "Something strange happened"});
            }
        });                    
    });


    app.get("/login", function(req, res){
        res.render("login");
    });

    app.post("/login", function(req, res){
        dbops.login(db, req, function tryToLogin(response){
            if(response.status == "fail"){
                res.render("login", {error: response.message});
            } else if(response.status == "success"){
                req.session.message = "Logged in!"

                console.log("Here's the player who logged in: ");
                console.log(req.session.user);


                if (req.session.user.gameID){                                        // need to check if this player is in a game
                    res.redirect("game");
                } else {
                    dbops.getInvites(db, req, function invitePlayer(invitations){
                        res.render("intro", {invites: invitations});
                    });    
                }

            } else {
                res.render("login", {error: "Something strange happened"});
            }   
        });
    });

    app.get("/logout", function(req, res){
        req.session.user = null;
        req.session.expires = new Date(Date.now);       /* not sure if this is needed */
        res.render("login", {error: "Logged out"});
    })


    /* GAME */

    app.get("/game", function(req, res){
        if(req.session.user){
            console.log("-- logged in");
            database.read(db, "player", {name: req.session.user.name}, function checkPlayer(player){
                if (player[0].gameID != "null" && player[0].gameID != null){   
                    console.log("--in a game");                                     // need to check if this player is in a game
                    dbops.directToGame(db, req, function determineGameStatus(response){
                        console.log("got the status: " + response.status);
                        if(response.status == "started"){
                            res.render("game");
                        } else if(response.status == "capital"){
                            res.render("capital");
                        } else if(response.status == "invite"){
                            res.render("invite");
                        } else if (response.status == "waiting"){
                            dbops.getInvites(db, req, function invitePlayer(invitations){
                                /* NEED TO GET PLAYERS IN THIS GAME, NOT INVITES*/
                                res.render("waiting", {invites: invitations});
                            });
                        } else {
                            res.render("index", {error: "Something went wrong"});
                        }

                    })
                } else {
                    dbops.getInvites(db, req, function invitePlayer(invitations){
                        res.render("intro", {invites: invitations});
                    });
                }
            });
        } else {
            res.redirect("/login");
        }

    });

    app.get("/game-info", function(req, res){
        if(req.session.user){                        // if this user is logged in 
            console.log("logged in...");
            if(req.session.user.gameID){
                console.log("in a game...");
                console.log("Game ID: " + req.session.user.gameID);
                
                onload.checkForAttacks(db, req, function confirm(){
                    onload.addResources(db, req, function resourcesAdded(){
                        onload.resolveAttacks(db,req, function resolveAttacks(){
                            onload.clearNotifications(db,req, function notificationsCleared(){
                                dbops.getGameData(db, req, function sendGameData(gameData){
                                    res.send(gameData);
                                }) 
                            })
                        })         
                    });          
                });  


            } else {
                console.log("NOT IN A GAME!");
                req.session.error = "You are not in a game yet.";
                res.redirect("/new-game");
            }
        } else {
            req.session.error = "You're not logged in";
            res.redirect("/login");
        }
    });

    app.post("/buy-unit", function(req, res){
        dbops.buyUnit(db, req, function(response){
            if(response.status == "success"){
                res.send(response)
            } else {
                res.send({message: response.message})
            }



        })
    });

    app.post("/assign", function(req, res){
        dbops.assignWorker(db, req, function(response){
            if(response.status == "success"){
                res.send(response)
            } else {
                res.send({message: response.message})
            }
        })
    });

    /* modals */


    app.get("/build", function(req, res){
        dbops.getGameData(db, req, function(updatedData){
            res.render("modals/build-modal", {buildings: updatedData.playerData.city.buildings});
        }) 
    });

    app.post("/build", function(req, res){
        dbops.build(db, req, function(response){
            if(response.status == "success"){
                res.send(response)
            } else {
                res.send({message: response.message})
            }
        })
    });


    app.get("/buy-units", function(req, res){
        dbops.getGameData(db, req, function(updatedData){
            res.render("modals/buy-unit-modal", {buildings: updatedData.playerData.city.buildings});
        }) 
    });

    app.post("/buy-units", function(req, res){
        dbops.buyUnit(db, req, function(response){
            if(response.status == "success"){
                res.send(response)
            } else {
                res.send({message: response.message})
            }
        })
    });


   app.get("/assign", function(req, res){
        dbops.getGameData(db, req, function(updatedData){
            workerUnits = updatedData.unitData.filter(function(el){         // this is how we get from all units to individual units
                return el.type == "worker"
            })

            res.render("modals/worker-modal", {workers: workerUnits});
        }) 
    });

    app.post("/assign", function(req, res){
        dbops.assignWorker(db, req, function(response){
            if(response.status == "success"){
                res.send(response)
            } else {
                res.send({message: response.message})
            }
        })
    });

    app.get("/group", function(req, res){
        dbops.getGameData(db, req, function(updatedData){
            res.render("modals/group-modal", {units: updatedData.unitData, player: updatedData.playerData});
        }) 
    });

    app.post("/group", function(req, res){
        dbops.groupUnit(db, req, function(response){
            if(response.status == "success"){
                res.send(response)
            } else {
                res.send({message: response.message})
            }
        })
    });

    app.get("/actions", function(req, res){
        dbops.getGameData(db, req, function(updatedData){
            enemy = updatedData.opponentData.filter(function(opponent){
                return opponent.name == req.query.name
            })

            res.render("modals/actions-modal", {opponent: enemy[0], units: updatedData.unitData, player: updatedData.playerData});
        }) 
    });


    app.get("/allplayers", function(req, res){
        res.render("allplayers");
    })


    app.post("/attack-player", function(req, res){
        console.log("attacked!");
        dbops.attackPlayer(db, req, function confirm(response){
            res.send(response);
        });
    })




    app.get("/defenses", function(req, res){
        dbops.getGameData(db, req, function(updatedData){
            res.render("modals/defenses-modal", {units: updatedData.unitData, player: updatedData.playerData});
        }) 
    });

    app.post("/defenses", function(req, res){
        dbops.positionGroup(db, req, function(response){
            res.send(response);           
        }) 
    });




    /* delete everything*/

    app.get("/apocalypse", function(req, res){
        dbops.apocalypse(db, function restart(){
            req.session.user = null;
            req.session.expires = new Date(Date.now);       /* not sure if this is needed */
            req.session.message = "Everything's gone";
            res.redirect("/signup");
        });
    })

    app.get("/allplayers", function(req, res){
        res.render("allplayers");
    })


    /* create game */

    app.post("/new-game", function(req, res){
        if(req.session.user){  
            dbops.createNewGame(db, req, function redirectToGame(game){
                req.session.user.gameID
                res.redirect("/game");
            });
        } else {
            req.session.error = "You're not logged in";
            res.redirect("/login");
        }
    })


    app.post("/invite", function(req, res){
        dbops.invite(db, req, function redirectToGame(response){
            if(response.status == "success"){
                res.render("invite", {message: response.message})
            } else {
                res.render("invite", {error: response.message})
            }
        });
    })

    app.post("/joingame", function(req, res){
        dbops.joinGame(db, req, function redirectToGame(response){
            res.redirect("/game");
        });
    })

    app.post("/name-city", function(req, res){
        dbops.nameCity(db, req, function redirectToGame(response){
            res.redirect("/game");
        });
    })

    app.post("/startgame", function(req, res){
        dbops.startGame(db, req, function redirectToGame(response){
            console.log("response.status: " + response.status)
            if(response.status == "success"){
                res.redirect("/game")
            } else {
                res.render("invite", {error: response.message});
            }
        });
    })

/* battle */



    app.post("/engage", function(req, res){
        dbops.battle(db, req, function redirectToGame(response){
            console.log("engage response.status: " + response.status)
            if(response.status == "success"){
                res.send(response)
            } else {
                res.send({message: response.message})
            }
        });
    })










/* END ROUTES */



    /* 404 */

    app.use(function(req, res) {
        res.status(404);
        req.session.error = "404 - page not found!";
        res.redirect("/");
    });

    app.listen(app.get("port"), function() {
        console.log("Server started on port " + app.get("port"));
    });
});

