"use strict";

var AWS = require("aws-sdk");
AWS.config.region = 'us-west-2';
var s3 = new AWS.S3();

var User = require("../models/User");
var File = require("../models/File");

module.exports = function(router) {
  // methods for /users
  router.route("/")
    .get(function(req, res) {
      User.find({}, function(err, users) {
        if (err) {
          res.status(500).json({msg: "server error"});
        } else {
          res.json(users);
        }
      });
    })
    .post(function(req, res) {
      // Attempt to create user with data received
      User.create(req.body, function(err, user) {
        if (err) {
          // Check for 'E11000' (duplicate key error)
          if (err.code === 11000) {
            res.status(409).json({msg: "username already exists"});
          } else {
            res.status(500).json({msg: "server error"});
          }
        } else {
          //Create the bucket
          s3.createBucket({Bucket: "colincolt/" + user.username}, function(err, data) {
            if (err) {
              res.status(500).json({msg: "server error"});
            } else {
              res.status(201).json(user);
            }
          });
        }
      });
    });
  // methods for /users/:user
  router.route("/:user")
    .get(function(req, res) {
      User.findOne({username: req.params.user}, function(err, user) {
        if (err) {
          res.status(500).json({msg: "server error"});
        } else {
          if (user) {
            res.json(user);
          } else {
            res.status(404).json({msg: "no such user"})
          }
        }
      });
    });
};
