"use strict"

const fs = require('fs');
const Sqlite = require('better-sqlite3');

const db = new Sqlite('db.sqlite');

const load = function() {

  const bikes = JSON.parse(fs.readFileSync('data/bikes.json'));
  const common_services = JSON.parse(fs.readFileSync('data/common_services.json'));

  db.prepare('DROP TABLE IF EXISTS bikes').run();
  db.prepare('DROP TABLE IF EXISTS user').run();
  db.prepare('DROP TABLE IF EXISTS commonservice').run();
  db.prepare('DROP TABLE IF EXISTS specificservice').run();
  db.prepare('DROP TABLE IF EXISTS garage').run();

  db.prepare('CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, level INT)').run();
  db.prepare('CREATE TABLE bikes (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT, model TEXT, year TEXT, img TEXT, engine TEXT, power TEXT, weight TEXT, price TEXT, type TEXT)').run();
  db.prepare('CREATE TABLE commonservice (service_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, time TEXT, regularity TEXT, kilometers TEXT, price TEXT, tutorial TEXT)').run();
  db.prepare('CREATE TABLE specificservice (service_id INT, bike INT, name TEXT, description TEXT, time TEXT, regularity TEXT, kilometers TEXT, price TEXT)').run();
  db.prepare('CREATE TABLE garage (garage_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT, bike_id INT, base_kilometers TEXT, usage TEXT, services TEXT, specificservice TEXT, date_added INT)').run();

  const admin = 'admin';
  const adminpassword = 'admin';
  db.prepare('INSERT INTO user (username, password, level) VALUES (@username, @password, @level)').run({username: admin, password: adminpassword, level: 0});

  const bikeInsert = db.prepare('INSERT INTO bikes VALUES (@id, @brand, @model, @year, @img, @engine, @power, @weight, @price, @type)');
  const common_servicesInsert = db.prepare('INSERT INTO commonservice VALUES (@service_id, @name, @description, @time, @regularity, @kilometers, @price, @tutorial)');
  const specific_ServicesInsert = db.prepare('INSERT INTO specificservice VALUES (@service_id, @bike, @name, @description, @time, @regularity, @kilometers, @price)');


  let transaction = db.transaction((bikes, common_services) => {

    for(let id=0; id < bikes.length; id++){
      let bike = bikes[id];
      bike.id = (id+1);
      bikeInsert.run(bike);

      if(bike.services === undefined) continue;
      for(let j=0; j < bike.services.length; j++){
        specific_ServicesInsert.run({service_id: (j+1), bike: (id+1), name: bike.services[j].name, description: bike.services[j].description, time: bike.services[j].time,
           regularity: bike.services[j].regularity, kilometers: bike.services[j].kilometers, price: bike.services[j].price});
      }
    }

    for(let id=0; id < common_services.length; id++){
      let common_service = common_services[id];
      common_service.service_id = (id+1);
      common_servicesInsert.run(common_service);
    }
  });

  transaction(bikes, common_services);
}

load();

