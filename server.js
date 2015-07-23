"use strict";
//Express app
var express = require("express");
var app = express();

//DB connection
var mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017");

var db = mongoose.connection;

db.on("error", function(err) {
  console.log("DB connection error: " + err);
});

//Route mounting



//Start server
var server = app.listen(3000, function() {
  app.emit("open");
});

// module.exports = {
//   app: app,
//   db: db
// };
module.exports.app = app;
module.exports.server = server;
module.exports.db = db;

