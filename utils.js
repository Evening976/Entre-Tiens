"use strict";

const Sqlite = require("better-sqlite3");
let db = new Sqlite("db.sqlite");

exports.serviceRegularityToDate = function (days) {
  let months = days / 30;
  let years = months / 12;
  let result = "";

  if (years >= 1) {
    years = Math.floor(years);

    if (years > 1) {
      result += years + " ans";
    } else {
      result += years + " an";
    }

    if (months % 12 > 0) {
      result += " et " + Math.floor(months % 12) + " mois";
    }
  } else if (months >= 1) {
    months = Math.floor(months);
    result += months + " mois";
  } else {
    result += days + " jours";
  }

  return result;
};

exports.parseCommonServices = function (garage_id, to_display = false) {
  let bike = db
    .prepare("SELECT * FROM garage WHERE garage_id = ?")
    .get(garage_id);

  let value = [];

  let services = db.prepare("SELECT * FROM commonservice").all();
  for (let i = 0; i < services.length; i++) {
    let doneDate = "Jamais";

    if (bike.services != null) {
      let servicesDone = JSON.parse(bike.services);
      doneDate = servicesDone.find(
        (service) => service.service_id == services[i].service_id
      ).doneDate;
    }

    let nextDate = this.calculateNextDate(garage_id, services[i], doneDate);

    if (to_display == true) {
      if (doneDate != "Jamais") {
        doneDate = TimeToDate(doneDate);
      }
      nextDate = TimeToDate(nextDate);
    }

    value.push({
      service_id: services[i].service_id,
      name: services[i].name,
      doneDate: doneDate,
      nextDate: nextDate,
      price: services[i].price,
    });
  }

  return value;
};

exports.calculateNextDate = function (garage_id, service, lastDate) {
    let bike = db
    .prepare(
      "SELECT bike_id, kilometers, usage FROM garage WHERE garage_id = ?"
    )
    .get(garage_id);

  let byDate;
  let byDistance;

  if (lastDate == "Jamais" || lastDate == undefined) {
    byDate = new Date(
      new Date().getTime() + daysToTime(service.regularity)
    ).getTime();
    byDistance = new Date(
      new Date().getTime() +
        daysToTime(service.kilometers / (bike.usage / 7))
    ).getTime();
  } else {
    byDate = new Date(
      new Date(parseInt(lastDate)).getTime() + daysToTime(service.regularity)
    ).getTime();
    byDistance = new Date(
      new Date(parseInt(lastDate)).getTime() +
        daysToTime(service.kilometers / (bike.usage / 7))
    ).getTime();
  }

  if (byDate < byDistance) {
    return byDate;
  } 
    return byDistance;
};

function TimeToDate(time) {
  let d = new Date(parseInt(time));
  return d.toLocaleString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function daysToTime(days) {
  return days * 24 * 60 * 60 * 1000;
}
