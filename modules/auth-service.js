const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
let Schema = mongoose.Schema;
require('dotenv').config();

let userSchema = new Schema({
    userName: {
        type: String,
        unique: true,
    },
    password: String,
    email: String,
    loginHistory: [{
        dateTime: Date,
        userAgent: String,
    }],
})

let User; // to be defined on new connection (see initialize)

function initialize() {
return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(process.env.MONGODB);

    db.on('error', (err)=>{
        reject(err); // reject the promise with the provided error
    });
    db.once('open', ()=>{
       User = db.model("users", userSchema);
       resolve();
    });
});
}

function registerUser(userData) {
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
        }
        else {
            bcrypt.hash(userData.password, 10).then(hash=>{ 
                userData.password = hash;
                let newUser = new User(userData); 
                newUser.save().then(() => {
                    console.log("All good");
                    resolve();
                })
                .catch((err) =>{
                    console.log("Oh no!");
                    if (err.code === 11000) reject("User Name already taken"); //username is defined as a unique value in this schema, code reflects duplicity
                    else reject (`There was an error creating the user: ${err}`);
                })           
            })       
            .catch(err=>{ //if the password hashing fails for some reason
                console.log(err); // Show any errors that occurred during the process
                reject("There was an error encrypting the password");
            });
        }
    })

}

//validate the user exists in the db & their passwords match, then record login history
function checkUser(userData) {
    return new Promise((resolve, reject) => {
    User.find({userName: userData.userName}).exec().then((data) => { //should return an array of one object
        if (data.length === 0) {
            console.log("Existence failed");
            reject(`Unable to find user: ${userData.userName}`);
        }
        //DEBUG
        //console.log(data);
        bcrypt.compare(userData.password, data[0].password).then((result) => {      
        if (result) {
            //user logs in
            //Check if there are 8 login history items (this is our maximum) and if there are, 
            //pop the last element from the array:
            if(data[0].loginHistory.length == 8){
                data[0].loginHistory.pop()
            }
            //Now that we have space in our loginHistory array, add a new entry to the front of the array using "unshift()":
            data[0].loginHistory.unshift({dateTime: (new Date()).toString(), userAgent: userData.userAgent});
            //Next, invoke the updateOne method on the User object where userName is users[0].userName and $set the loginHistory 
            //value to users[0].loginHistory
            User.updateOne({userName: data[0].userName}, {$set: {loginHistory: data[0].loginHistory}})
            .exec()
            .then(() =>{
                //if successful, resolve with the user object
                resolve(data[0]);
            })
            .catch((err)=> {
                console.log("Just another friendly debug");
                reject(`There was an error verifying the user: ${err}`);
            })
        }
        else {
            console.log("Password mismatch");
            reject(`Incorrect Password for user: ${userData.userName}`);
        }
        })
        .catch((err) =>{
            console.log(err);
            reject(err);
        })

    })
    .catch(() =>{
        reject(`Unable to find user: ${userData.userName}`);
        console.log("Catch block of checkUser find!");
    })
})

}

module.exports = {initialize, checkUser, registerUser};