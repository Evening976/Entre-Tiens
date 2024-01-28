"use strict"
/* Serveur pour le site de recettes */
var express = require('express');
var mustache = require('mustache-express');
var cookieSession = require('cookie-session');
var sqlite = require('better-sqlite3');

let db = new sqlite('db.sqlite');

var model = require('./model');
var utils = require('./utils');
var app = express();

// parse form arguments in POST requests
const bodyParser = require('body-parser');

app.use(cookieSession({
  secret: 'qMRgNGLtqJ',
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session_valid);

app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', './views');


function session_valid(req, res, next){
  if(!req.session.user){
    req.session.user = {id: -1, username: ''};
  }

  if(req.session.user.id != -1){
    res.locals.authenticated = true;
    res.locals.name = req.session.user.username;
    res.locals.admin = !(req.session.user.level);
  }
  
  next();
}

function post_data_to_bike(req) {
    return {
      brand: req.body.brand, 
      model: req.body.model,
      year: req.body.year,

      img: req.body.img,
      
      engine: req.body.engine,
      power: req.body.power,
      weight: req.body.weight,
      price: req.body.price,
      type: req.body.type,
    };
  }

function is_authenticated(req, res, next){
  if(res.locals.authenticated){
    next();
  }
  else{
    res.status(401).send('Veuilez vous connecter pour accéder à cette page');
  }
}

function login(name, password){
  var found = db.prepare('SELECT id, username, level FROM user WHERE username = ? AND password = ?').get(name, password);
  if(found){
    return found;
  }
  return -1;
}

function signup(name, password){
  var newUser = db.prepare('INSERT INTO user (username, password, level) VALUES (?, ?, 1)');
  return newUser.run(name, password).lastInsertRowid;
}

/**** Routes pour voir les pages du site ****/

/* Retourne une page principale avec le nombre de recettes */
app.get('/', (req, res) => {
  res.render('index');
});

/* Retourne les résultats de la recherche à partir de la requête "query" */
app.get('/search', (req, res) => {
  var found = model.search(req.query.query, req.query.page);
  res.render('search', found);
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
  });

/* Retourne le contenu d'une moto d'identifiant "id" */
app.get('/read/:id', (req, res) => {
  var bike_id = model.read(req.params.id);
  res.render('read', bike_id);
});

app.get('/create', is_authenticated, (req, res) => {
  res.render('create');
});

app.get('/update/:id', is_authenticated, (req, res) => {
  var bike_id = model.read(req.params.id);
  res.render('update', bike_id);
});

app.get('/delete/:id', is_authenticated, (req, res) => {
  var entry = model.read(req.params.id);
  res.render('delete', entry);
});

app.get('/service/:id', (req,res) => {
  var entry = model.service(req.params.id);
  res.render('service', entry);
});

app.get('/garage', is_authenticated, (req, res) => {
    res.render('garage', model.garage(req.session.user.id));
});

app.get('/garage/:garage_id', is_authenticated, (req, res) => {
    var entry = model.garageDetails(req.params.garage_id);
    if(entry == null){
        res.status(404).send('Erreur 404 : Cette moto n\'existe pas');
    }
    else{
      res.render('garage_details', entry);
    }
});

/**** Routes pour modifier les données ****/

app.post('/create', is_authenticated, (req, res) => {
  var id = model.create(post_data_to_bike(req));
  res.redirect('/read/' + id);
});

app.post('/update/:id', is_authenticated, (req, res) => {
  var id = req.params.id;
  model.update(id, post_data_to_bike(req));
  res.redirect('/read/' + id);
});

app.post('/add_to_garage/:id', is_authenticated, (req, res) => {
    var bike_id = req.params.id;
    var user_id = req.session.user.id;
    model.addtogarage(bike_id, user_id, req.body.kilometers, req.body.usage);

    res.redirect('/garage');
});

app.post('/delete/:id', is_authenticated, (req, res) => {
  model.delete(req.params.id);
  res.redirect('/');
});

app.post('/signup', (req, res) => {
  var id = signup(req.body.username, req.body.password);
  if(id != -1){
    req.session.user = {id: id, username: req.body.username, level: 1};
    res.redirect('/');
  }
  else{
    res.redirect('/signup');
  }
});

app.post('/garage/:id', is_authenticated, (req, res) => {
    var service_id = req.body.service_id;
    var garage_id = req.params.id;
    model.markServiceAsDone(service_id, garage_id);

    res.redirect('/garage/' + garage_id);
});


app.post('/login', (req, res) => {
  var account = login(req.body.username, req.body.password);

  if(account != -1){
    req.session.user = {id: account.id, username: req.body.username, level: account.level};
    res.status(200).send();
  }
  else{
    res.status(401).send();
  }
});

app.listen(3000, () => console.log('listening on http://localhost:3000'));

