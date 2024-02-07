"use strict"
/* Module de recherche dans une base de recettes de cuisine */
const Sqlite = require('better-sqlite3');

let db = new Sqlite('db.sqlite');
const utils = require('./utils');


exports.read_bike_data = (id) => {
  let found = db.prepare('SELECT * FROM bikes WHERE id = ?').get(id);

  if(found !== undefined) {
    found.services = db.prepare('SELECT name, description, time, regularity, kilometers, price FROM specificservice WHERE bike = ?').all(id);

    for(let i = 0; i < found.services.length; i++){
      found.services[i].regularity = utils.serviceRegularityToDate(found.services[i].regularity);
    }

    return found;
  } else {
    return null;
  }
};

exports.service = (id) => {
  const found = db.prepare('SELECT * FROM commonservice WHERE service_id = ?').get(id);

  if(found !== undefined) {
    return found;
  } else {
    return null;
  }
};

exports.garageDetails = (garage_id) =>
{
  const found = db.prepare('SELECT * FROM garage WHERE garage_id = ?').get(garage_id);
  if(found !== undefined) {
    const bike = db.prepare('SELECT * FROM bikes WHERE id = ?').get(found.bike_id);
    return {
      garage_id: found.garage_id,
      services: utils.parseCommonServices(garage_id, true),
      bike_id : found.bike_id,
      model : bike.model,
      brand : bike.brand,
      year : bike.year,
      img : bike.img,
      engine : bike.engine,
      power : bike.power,
      weight : bike.weight,
      price : bike.price,
      type : bike.type,
      usage: found.usage,
      kilometers: utils.calculateCurrentKilometers(found.base_kilometers, found.usage, found.date_added)
    };
  }
  else{
    return null;
  }
};

exports.create = function(bike) {
  const id = db.prepare('INSERT INTO bikes (brand, model, year, img, engine, power, weight, price, type) VALUES (@brand, @model, @year, @img, @engine, @power, @weight, @price, @type)').run(bike).lastInsertRowid;
  return id;
}


exports.update = function(id, bike) {
  const result = db.prepare('UPDATE bikes SET brand = @brand, model = @model, year = @year, img = @img, engine = @engine, power = @power, weight = @weight, price = @price, type = @type WHERE id = ?').run(bike, id);
  if(result.changes == 1) {
    return true;
  }
  return false;
}


exports.addtogarage = function(bike_id, user_id, kilometers, usage){
  if(usage == null || usage == undefined || usage == "") {usage = Math.trunc(3691/52);}
  let d = new Date().getTime();
  db.prepare('INSERT INTO garage (user_id, bike_id, base_kilometers, usage, services, date_added) VALUES (@user_id, @bike_id, @base_kilometers, @usage, NULL, @date_added)').
  run({user_id: user_id, bike_id: bike_id, base_kilometers: kilometers, usage: usage, date_added: d});
}

exports.delete = function(id) {
  db.prepare('DELETE FROM bikes WHERE id = ?').run(id);
  db.prepare('DELETE FROM specificservice WHERE bike = ?').run(id);
}


exports.garage = function(user_id, username){

  const user_bikes = db.prepare('SELECT bike_id, base_kilometers, garage_id, date_added, usage FROM garage WHERE user_id = ?').all(user_id);

  let results = [];


  for(let i = 0; i < user_bikes.length; i++){
    const bike = db.prepare('SELECT * FROM bikes WHERE id = ?').get(user_bikes[i].bike_id);

    console.log("date_ADDED : " + user_bikes[i].date_added);

    results[i] = {
      garage_id: user_bikes[i].garage_id,
      bike_id: bike.id,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      img: bike.img,
      engine: bike.engine,
      power: bike.power,
      weight: bike.weight,
      price: bike.price,
      type: bike.type,
      kilometers: utils.calculateCurrentKilometers(user_bikes[i].base_kilometers, user_bikes[i].usage, user_bikes[i].date_added),
      usage: user_bikes[i].usage,
    }
  }

  return {
    username: utils.getPronoun(username) + username,
    bikes_id: user_bikes,
    garage: results
  }
}


exports.markServiceAsDone = (service_id, garage_id) => {
  const service_infos = db.prepare('SELECT * FROM commonservice WHERE service_id = ?').get(service_id);

  let services = utils.parseCommonServices(garage_id, false);
  const service = services.find(service => service.service_id == service_id);
  const date = new Date().getTime();

  let newService = {
      service_id: service.service_id,
      name: service.name,
      doneDate: date,
      nextDate: utils.calculateNextDate(garage_id, service_infos, date),
      price: service.price
  }
  services[services.indexOf(service)] = newService;
  db.prepare('UPDATE garage SET services = ? WHERE garage_id = ?').run(JSON.stringify(services), garage_id);
}


exports.search = (query, page) => {
  const num_per_page = 32;
  query = query || "";
  page = parseInt(page || 1);

  const num_found = db.prepare('SELECT count(*) FROM bikes WHERE model LIKE ?').get('%' + query + '%')['count(*)'];
  const results = db.prepare('SELECT id as bike_id, brand, model, year, img, engine, power, weight, price, type FROM bikes WHERE model LIKE ? ORDER BY id LIMIT ? OFFSET ?').all('%' + query + '%', num_per_page, (page - 1) * num_per_page);
  const num_pages = parseInt(num_found / num_per_page) + 1;

  return {
    results: results,
    num_found: num_found,
    query: query,
    next_page: ((page + 1) <= num_pages) ? page + 1 : null,
    page: page,
    num_pages: num_pages,
  };
};



