const data = require("./dbops");

function newPlayer(db, player, res, callback){
	data.create(db, "player", player, res, function(){
		




	});


}





module.exports.newPlayer = newPlayer;