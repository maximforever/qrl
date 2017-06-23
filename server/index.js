
/* dependencies */
const http = require("http");
const fs = require("fs");                               // file system
const path = require("path");                           // access paths
const express = require("express");                     // express
const MongoClient = require('mongodb').MongoClient;     // talk to mongo
const bodyParser = require('body-parser');              // parse request body
var session = require('express-session')                // create sessions
var db;                                                 // placeholder for our database

const app = express();
app.set("port", process.env.PORT || 3000)               // we're gonna start a server on whatever the environment port is or on 3000
app.set("views", path.join(__dirname, "../client/views"));        // tells us where our views are
app.set("view engine", "ejs");                          // tells us what view engine to use

app.use(express.static('client'));         // sets the correct views for the CSS file/generally accessing files




const data = require("./app/database");
const dbops = require("./app/dbops");


MongoClient.connect("mongodb://localhost:27017/qrl", function(err, database){
    if (err){
        console.log("MAYDAY! MAYDAY! Crashing.");
        return console.log(err);
    }

    db = database;                                      // mongo passes us a database, we store its contents in this variable... I think.
    
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(bodyParser.json());                         // for parsing application/json


    app.use(session({
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

    app.use(function(req, res, next) {                                          // makes session available to all views
        app.locals.session = req.session;
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
        console.log(req.body);
        if((req.body.name).replace(/\s/g, '').length > 0){          // let's make sure the input name isn't empty   
            var newPlayer = {
                gameID: null,
                name: req.body.name,
                email: req.body.email
                /*, stats: {
                    econ_level: 1,
                    military_level: 1
                },
                city: {
                    name: "TBD"
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
                        green: 0,
                        red: 0,
                        blue: 0
                    }
                }*/
            }

            /*var newScout = {
                type: "scout",
                lastUpdated: Date.now(),
                owner: newPlayer.name,
                job: "none",
                id: Date.now()
            }*/

            dbops.newPlayer()

            

        } else {
            res.send("cannot save player with no name or capital");
        }
        
    });










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

