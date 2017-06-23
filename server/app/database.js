function create(db, col, obj, res, callback){
    console.log("DB: creating");
    db.collection(col).save(obj, function(err, result){
        if (err){
            console.log("MAYDAY! MAYDAY! Crashing.");
            return console.log(err);
        }
        console.log("Saved the object to the database!");
        callback();
    })
}

function find(db, col, obj, res, callback){                                // Equivalent to read
    console.log("DB: reading");
    db.collection(col).find(obj).toArray(function(err, result){
        if (err){
            console.log("MAYDAY! MAYDAY! Crashing.");
            return console.log(err);
        }
        console.log("FIND: pulled " + result.length + " records from '" + col + "' for the query:");
        console.log(obj);
        callback(result);
    })
}

function update(db, col, item, query, callback){
    console.log("DB: updating");
    console.log("item is: ");
    console.log(item);
    console.log("query is: ");
    console.log(query);

    db.collection(db, col).update(item, {$set: query}, function displayAfterUpdating(){
        console.log("Updated successfully! Fetching object: ");
        find(colection, item, res, function showUpdated(updatedItem){           // do we need to find the item again?
            console.log("HERE IT IS:");
            console.log(updatedItem[0]);
            callback(updatedItem[0]);
        });
    });
}


function remove(db, col, query, res, callback){
    
    db.collection(col).remove(query, function removeThis(err, result) {
        if (err){
            console.log("MAYDAY! MAYDAY! Crashing.");
            return console.log(err);
        }
        callback("Database: Record successfully deleted");
    });
};









module.exports.create = create;
module.exports.find = find;
module.exports.update = update;
module.exports.remove = remove;