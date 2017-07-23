/* THIS IS A SAMPLE COMBAT MECHANICS FILE */

function Unit(id, type, player, str, armor, speed, hp){
	this.id = id;
	this.type = type;
	this.player = player;
	this.str = str;
	this.armor = armor;
	this.speed = speed;
	this.hp = hp
}

var p1 = [];
var p2 = []

seven = new Unit(7, "footman", 1, 5, 3, 3, 10);
eight = new Unit(8, "footman", 1, 5, 3, 3, 10);
one = new Unit(1, "footman", 1, 5, 3, 3, 10);
two = new Unit(2, "footman", 1, 5, 3, 3, 10);
three = new Unit(3, "archer", 1, 5, 1, 8, 10);

four = new Unit(4, "archer", 2, 5, 1, 8, 10);
five = new Unit(5, "archer", 2, 5, 1, 8, 10);
six = new Unit(6, "archer", 2, 5, 1, 8, 10);

var allUnits = [one, two, three, four, five, six, seven, eight];
var all = [];
var p1 = [];
var p2 = [];



allUnits.forEach(function(unit){							// create an array of all the units by speed as frequency
	//console.log(unit.id + ", speed: " + unit.speed);
	for(var i = 0; i < unit.speed; i++){
		all.push(unit)
	}

	if(unit.player == 1){
		p1.push(unit);
	}

	if(unit.player == 2){
		p2.push(unit);
	}


});

/*console.log("all" + all);
console.log("1: " + p1);
console.log("2: " + p1);*/




/*
	1. archers go first (because... speed)
	2. pick a random ID from all
	3. pick a random enemy from opposite player
	4. calc damage 
		- damage = str - armor
		- check if archer vs. footman if yes --> ignore armor
	5. reduce defender HP by damage
	6. check if defender is dead. 
		- if dead, remove from all 3 arrays
*/


/* TESTING! */

var p1wins = 0;
var p2wins = 0;



function battle(all, p1, p2){
	if(p1.length > 0 && p2.length > 0){
		var attacker = all[Math.floor(Math.random()*all.length)];
		var defender;
		var damage;

		if (attacker.player == 1){
			defender = p2[Math.floor(Math.random()*p2.length)];
		} else if (attacker.player == 2){
			defender = p1[Math.floor(Math.random()*p1.length)];
		}

		//console.log("attacker: " + attacker.id + ", " + attacker.type);
		//console.log(attacker.id);

		//console.log("defender: " + defender.id + ", " + defender.type);

		damage = attacker.str - defender.armor;

		if(attacker.type == "archer"){				// if attacked by archer, ignore armor
		//console.log("ignoring armor!");
			damage += defender.armor;
		}

		defender.hp -= damage;						// DEAL THE DAMAGE

		/* if dead, remove from arrays... */

		if(defender.hp <= 0){
		//	console.log("XXXXXX unit " + defender.id + " is dead");
															
			all = all.filter(function(unit){					// remove from all
				return unit.id != defender.id;
			})
			
			if(defender.player == 1){							// remove either from p1 or p2
				p1 = p1.filter(function(unit){
					return unit.id != defender.id;
				})
			} else if(defender.player == 2){
				p2 = p2.filter(function(unit){
					return unit.id != defender.id;
				})


			}
		}
	
		if(p1.length > 0 && p2.length > 0){
			battle(all, p1, p2);
		} else {
			if(p1.length <= 0){
			//	console.log("P1 is dead!");
				p2wins++;
			} else if(p2.length <= 0){
			//	console.log("P2 is dead!");
				p1wins++;
			}

		}
	}
}



var runs = 1;

for(var i = 0; i < runs; i++){

	battle(all, p1, p2);

}

console.log("p1Wins: " + Math.floor(p1wins/runs*100));
console.log("p2Wins: " + Math.floor(p2wins/runs*100));
