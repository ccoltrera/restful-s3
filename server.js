"use strict";
//Express app
var express = require("express");
var app = express();
var bodyParser = require("body-parser");

//DB connection
var mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017");

var db = mongoose.connection;

db.on("error", function(err) {
  console.log("DB connection error: " + err);
});

//Route mounting
var usersRouter = express.Router();
require("./routes/users-routes")(usersRouter);

app.use(bodyParser.json());
app.use("/users", usersRouter);

//Start server
var server = app.listen(3000, function() {
  app.emit("open");
});

// module.exports = {
//   app: app,
//   db: db
// };
module.exports.app = app;
module.exports.serverInst = server;
module.exports.db = db;

