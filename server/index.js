
/* dependencies */
const http = require("http");
const fs = require("fs");                               // file system
const path = require("path");                           // access paths
const express = require("express");                     // express
const MongoClient = require('mongodb').MongoClient;     // talk to mongo
const bodyParser = require('body-parser');              // parse request body
var session = require('express-session')                // create sessions
//var db;                                                 // placeholder for our database

const app = express();
app.set("port", process.env.PORT || 3000)               // we're gonna start a server on whatever the environment port is or on 3000
app.set("views", path.join(__dirname, "../client/views"));        // tells us where our views are
app.set("view engine", "ejs");                          // tells us what view engine to use

app.use(express.static('client'));         // sets the correct views for the CSS file/generally accessing files





const dbops = require("./app/dbops");
const onload = require("./app/onload");


MongoClient.connect("mongodb://localhost:27017/qrl", function(err, db){
    if (err){
        console.log("MAYDAY! MAYDAY! Crashing.");
        return console.log(err);
    }

    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(bodyParser.json());                         // for parsing application/json


    app.use(session({                                   // I THINK we only need to do this once, because it's causing us to send 2 GET requests to '/'
        secret: 'awfulPassword',
        saveUninitialized: false,
        resave: false,
        secure: false,
        cookie: {}
    }));

    app.use(function(req, res, next){                                           // logs request URL
        var timeNow = new Date();
        console.log("-----> " + req.method.toUpperCase() + " " + req.url + " on " + timeNow);  
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
                res.redirect("game")
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

        if(!req.session.user){
            res.redirect("/login");
        } else {
            onload.addResources(db);
            res.render("game");
        }

    });

    app.get("/game-info", function(req, res){
        if(req.session.user){
            gameData = dbops.getGameData(db, req, function sendGameData(gameData){
                res.send(gameData);
            })
        } else {
            req.session.error = "You're not logged in";
            res.redirect("/");
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
        console.log("BUILDING!")
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


    /* delete everything*/

    app.get("/apocalypse", function(req, res){
        dbops.apocalypse(db, function restart(){
            req.session.user = null;
            req.session.expires = new Date(Date.now);       /* not sure if this is needed */
            req.session.message = "Evetything's gone";
            res.redirect("/signup");
        });
    })

    app.get("/allplayers", function(req, res){
        res.render("allplayers");
    })


/* END ROUTES */



/* TEST*/


var trigger = false;

app.get("/async", function (req, res){
    res.render("async");
});

app.post("/async", function (req, res){
    hold(respond);

    function respond(){
        res.send("hello world!");
    }
    
});


function hold(callback){

    a();

    function a(){
         setTimeout(function(){
            if(trigger){
                callback();
            } else {
                console.log("firing a()!");
                a();
            }
            
        }, 100);
    }
}

app.post("/trigger", function (req, res){
   trigger = true;
   //console.log("trigger is: " + trigger);
   res.send("success!");
});


app.post("/false", function (req, res){
   trigger = false;
   res.send("success!");
});




/* END TEST */



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

