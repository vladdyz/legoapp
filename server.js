/********************************************************************************
*
* Lego Store App
* By: Vladislav Zolotukhin Date: 2024-04-20
*
* Published URL: https://vzolotukhin-legoapp.onrender.com/   
*
********************************************************************************/

const legoData = require("./modules/legoSets");
const express = require("express");
const app = express();
const port = 8080;
const path = require('path');
const authData = require("./modules/auth-service");
const clientSessions = require("client-sessions");


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true}))
app.use(
    clientSessions({
      cookieName: 'session', // this is the object name that will be added to 'req'
      secret: 'a5flD3gRFB48Ndsa00Bg4D33gD1m3tr0d0n', // this should be a long un-guessable string.
      duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
      activeDuration: 1000 * 60, // the session will be extended by this many ms each request (1 minute)
    })
  );
  //session object to conditionally hide/show elements depending if the user is logged in or not
  app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
  });

  //taken from the WEB322 notes
  function ensureLogin(req, res, next) {
    if (!req.session.user) {
      res.redirect('/login');
    } else {
      next();
    }
  }


//First make sure we can properly load the sets array
legoData.initialize()
.then(authData.initialize)
.then(() => {
    //console.log(legoData.getAllSets());
    app.listen(port, () => { 
        console.log(`Server listening in on port: ${port}`);
    });
})
.catch((err) => { 
    console.log("Server failed for some reason! Displaying error message:");
    console.log(err);
});

app.get('/', (req, res) => { //Home Page
   res.render('home');
})

app.get('/about', (req, res) => { //About Page
    res.render('about');
})

app.get('/lego/sets', (req, res) => { //Lego Sets Page where the database of sets is rendered
    //Check if a theme query string is present
    const theme = req.query.theme;
    //using the variable for the query string, use the getSetsByTheme function from legoSets to search for the theme
    if (theme) {
        legoData.getSetsByTheme(theme)
        .then((data) => {
            console.log("Found the set");
            if (data.length === 0) {//no themes with that query could be found! Throw the user into a black hole
            res.status(404).render("404", {message: "No sets from this theme are currently available!"});
            } else {
                res.render('sets', {sets: data});
            }
        })
        .catch((err) => {
           res.status(404).render("404", {message: err});
        });
    }
    //Since its asynchronous, we need to wait for the promise to resolve before returning it (otherwise it will be EMPTY!)
    else { //if no query, just return all of the data like before
        legoData.getAllSets()
        .then((data) => {
            res.render('sets', {sets: data});
        })
        .catch(() => {
            res.status(404).render("404", {message: "I'm sorry, we're unable to find what you're looking for"});
        });
    }
})

app.get('/lego/sets/:setNum', (req, res) => { //Render individual lego sets
    //Check if there are any parameters after sets and return the specific id of the lego set matching them
    const id = req.params.setNum;

    //Again, wait for the promise to resolve before sending back the data, this time we have a custom error message in the catch
    //Change the param to something random to see it :) (ex: 10316-1 should return a valid data response, 10316-2 should not)
    legoData.getSetByNum(id)
    .then((data) => { 
        if (data.length !== 0) {
            //if we find a match, great! send it as a response
            res.render("set", {set: data});
            
        }
        else {
            res.status(404).render("404", {message: "The specified set number could not be found in the array!"});
        }
    })
    .catch((err) => {
        res.status(404).render("404", {message: "The specified set number could not be found in the array!"});
    })     
})

//Rendering the new ejs page for adding sets route
app.get('/lego/addSet', ensureLogin, (req, res) => {
    legoData.getAllThemes()
    .then((data)=> {
        res.render('addSet', {themes : data});
    })
    .catch((err) =>{ 
        res.status(404).render("404", {message: err});
    })
})

//sending the information containing the new set from the form in addSet via submit (posting it)
app.post('/lego/addSet', ensureLogin, (req, res) => {
    legoData.addSet(req.body)
    .then(()=>{
        res.redirect('/lego/sets');
    })
    .catch((err)=> {
        console.log("Debug, problem in server.js");
        console.log(err);
        console.log(req.body);
        res.render("500", { message: "DATABASE ERROR: Your information has been pulled into the void" });
    })
})

//rendering the new edit set page template for each lego item
app.get('/lego/editSet/:setNum', ensureLogin, (req, res)=>{
    const id = req.params.setNum;
    legoData.getSetByNum(id)
    .then((data)=>{
        legoData.getAllThemes()
        .then((themeData)=>{
            res.render("editSet", { themes: themeData, set: data});
        })
    })
    .catch((err) =>{ 
        res.status(404).render("404", {message: err});
    })
})

//posting the updated set data via the form on that page
app.post('/lego/editSet/:setNum', ensureLogin, (req, res)=>{
    legoData.editSet(req.body.set_num, req.body)
    .then(()=>{
        res.redirect('/lego/sets');
    })
    .catch(()=> {
        res.render("500", { message: "DATABASE ERROR: Your information has been pulled into the void" });
    })
})

//deleting a set from the collection (calling destroy on a row with the corresponding set_num value in the postgres db)
app.get("/lego/deleteSet/:num", ensureLogin, (req, res)=> {
    const id = req.params.num;
    legoData.deleteSet(id)
    .then(()=>{
        res.redirect('/lego/sets');
    })
    .catch((err)=>{
        console.log(err);
        res.render("500", { message: err });
    })
})

//Encryption/Login Routes
app.get("/login", (req, res) => {
    res.render("login", {userName: "", errorMessage: ""});
})

app.get("/register", (req, res) => {
    res.render("register", {userName: "", errorMessage: "", successMessage: ""});
})

app.post("/register", (req, res) => {
    authData.registerUser(req.body)
    .then(() => {
        res.render("register",{successMessage: "User created"});
    })
    .catch((err) => {
        res.render("register", {errorMessage: err, userName: req.body.userName, successMessage:""});
    })
})

app.post("/login", (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    authData.checkUser(req.body)
    .then((user)=>{
        req.session.user = {
            userName: user.userName,// authenticated user's userName
            email: user.email,// authenticated user's email
            loginHistory: user.loginHistory,// authenticated user's loginHistory
        }
    
        res.redirect('/lego/sets');
    })   
    .catch((err)=>{
        res.render("login", {errorMessage: err, userName: req.body.userName});
    })
})

app.get("/logout", (req, res) => {
    req.session.reset() //log out and reset the session
    res.redirect('/');
})

app.get("/userHistory", ensureLogin, (req, res) => {
        res.render("userHistory");
})



//For Testing Purposes
app.get('/500', (req, res) =>{
    res.render('500');
})


app.get('*', (req, res) => {
    res.status(404).render("404", {message: "You have reached the edge of the internet. Turn back at once! (Invalid URL)"});
})
