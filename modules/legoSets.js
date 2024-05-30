
require('dotenv').config();
//Sequelize Stuff
const Sequelize = require('sequelize');

// set up sequelize to point to the postgres database
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: { rejectUnauthorized: false },
  },
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch((err) => {
    console.log('Unable to connect to the database:', err);
  });

  const Project = sequelize.define(
    'Web322 Assignment 5',
    {
      project_id: {
        type: Sequelize.INTEGER,
        primaryKey: true, // use "project_id" as a primary key
        autoIncrement: true, // automatically increment the value
      },
      title: Sequelize.STRING,
      description: Sequelize.TEXT,
    },
    {
      createdAt: false, // disable createdAt
      updatedAt: false, // disable updatedAt
    }
  );

const Theme = sequelize.define('Theme', { 
    id: {
    type: Sequelize.INTEGER,
    primaryKey: (true),
    autoincrement: (true),
    },
    name: Sequelize.STRING,
});

const Set = sequelize.define('Set', {
    set_num: {
        type: Sequelize.STRING,
        primaryKey: (true),
    },
    name: Sequelize.STRING,
    year: Sequelize.INTEGER,
    num_parts: Sequelize.INTEGER,
    theme_id: Sequelize.INTEGER,
    img_url: Sequelize.STRING,
});
Set.belongsTo(Theme, {foreignKey: 'theme_id'})


function initialize() {
    return new Promise((resolve, reject) => { 
            sequelize.sync().then(() => {
                resolve();
            })   
            .catch ((err) => {
                console.log("Couldn't sync the Postgres database! Error : ");
                console.log(err);
                reject();
        })
    })
    /* Previous version below, now using Postgres DB instead of blending JSON objects
    
    return new Promise((resolve, reject) => { //making this whole function into a promise
        setData.forEach((data) => { //Iterating through the JSON array of objects, for every object
            let legoObject = data; //create a temporary object to hold each object from setData.json

            themeData.forEach((theme) => { //create a new key-value pair based on the theme_id and add it to the temporary object
                if (data.theme_id === theme.id) {
                     legoObject.theme = theme.name;
                 }
            });
        sets.push(legoObject); //add the object into the sets array
        });
    resolve(); //once the above code finishes executing, we can resolve the promise (it resolves with nothing, and there is no reject)
    })
    .catch((err) => { 
        console.log("Sync failed for some reason! Displaying error message:");
        console.log(err);
    });
    */
}

function getAllSets() {
    return new Promise((resolve, reject) => { 
        sequelize.sync().then(() => {
        return sets = Set.findAll({include: [Theme]})
        }).then((sets) => {
            resolve(sets);
        })
        .catch((err) => {
            console.log("An unexpected error has occurred when trying to connect to Postgres DB and return the sets");
            console.log(err);
            reject();
        })
    });

}

function getSetByNum(setNum) { //search for a specific setNum in the array, since its a unique value we can use the find method
    return new Promise((resolve, reject) => {
        sequelize.sync().then(() => {
          console.log(setNum);
        return foundSet = Set.findOne({include: [Theme], where: { set_num: setNum}}) //looking for only one set, shouldn't be multiples!
        }).then((foundSet) => {
          console.log(foundSet);        
            if (foundSet) resolve(foundSet);
            else  reject("The specified set number could not be found in the array!"); 
        })
    });
}

function getSetsByTheme(theme) {
    return new Promise((resolve, reject) => {
    sequelize.sync().then(() => {
      //console.log(theme);
    return foundSet = Set.findAll({include: [Theme], where: {  //have to return this for the .then to use it
        '$Theme.name$': {
          [Sequelize.Op.iLike]: `%${theme}%`
        }
      }})
    }).then((foundSet) => {
      console.log(foundSet);
        if (foundSet) resolve(foundSet)
        else reject("Could not find any sets that match the theme!"); 
      })
    });
}

function addSet(setData){ 
  return new Promise((resolve, reject) => {
    return Set.create(setData)
    .then(()=>{
      resolve();
    })
    .catch((err)=>{
      console.log("Debug: Problem in legoSets.js");
      console.log(err);
      reject("ERROR: Could not add item to the set");
    })

  })
}

function getAllThemes() {
  return new Promise((resolve, reject) => {
    return themes = Theme.findAll()
    .then((themes) =>{
      resolve(themes);
    })

  })

}

function editSet(set_num, setData) {
  return new Promise((resolve, reject) => {
    return Set.update(setData,{where: {set_num: set_num}})
    .then(()=> {
      resolve();
    })
    .catch(()=> {
      reject("Could not update the set, invalid data");
    })
  })
}

function deleteSet(set_num) {
  return new Promise((resolve, reject) => {
    return Set.destroy({
      where: { set_num: set_num }
    })
    .then(() =>{
      resolve();
    })
    .catch((err)=> {
      console.log(`Error: ${err}`);
      reject("Could not delete the specified set from the lego collection!");
    })
  })
}


/* EXPORTING THE FUNCTIONS INTO A MODULE */
module.exports = { initialize, getAllSets, getSetByNum, getSetsByTheme, addSet, getAllThemes, editSet, deleteSet };

//Sequelize Stuff (import the JSON into a SQL DB)
//need to only run this once, then remove it
/*
sequelize
  .sync()
  .then( async () => {
    try{
      await Theme.bulkCreate(themeData);
      await Set.bulkCreate(setData); 
      console.log("-----");
      console.log("data inserted successfully");
    }catch(err){
      console.log("-----");
      console.log(err.message);
    }
    process.exit();
  })
  .catch((err) => {
    console.log('Unable to connect to the database:', err);
  });
*/
