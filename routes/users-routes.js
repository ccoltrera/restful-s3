"use strict";

var AWS = require("aws-sdk");
AWS.config.region = 'us-west-2';
var s3 = new AWS.S3();

var User = require("../models/User");
var File = require("../models/File");

var EventEmitter = require("events").EventEmitter;
var ee = new EventEmitter();

module.exports = function(router) {
  // methods for /users/:user/files/:file

  // methods for /users/:user/files

  // methods for /users/:user
  router.route("/:user")
    .get(function(req, res) {
      User.findOne({username: req.params.user})
        .populate("_files")
        .exec(function(err, user) {
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
    })
    .put(function(req, res) {

      ee.on("finalFileCopy", function() {

      });
      ee.on("finalFileDelete", function() {

      });
    })
    .delete(function(req, res) {
      User.findOne({username: req.params.user})
        .populate("_files")
        .exec(function(err, user) {
          if (err) {
            res.status(500).json({msg: "server error"});
          } else {
            if (user) {
              var s3params = {
                Bucket: "colincolt/" + user.username,
                Delete: {
                  Objects:[]
                }
              };
              // Check if user has files to be deleted
              if (user._files.length === 0) {
                s3.deleteBucket({Bucket: "colincolt"}, function(err) {
                  if (err) res.status(500).json({msg: "server error"});
                  else {
                    User.remove({username: user.username}, function(err) {
                      res.json(user);
                    });
                  }
                });
              } else {
                // Iterate over file names, adding them to s3params
                for (var i = 0; i< user._files.length; i++) {
                  s3params["Delete"]["Objects"].push({
                    Key: user.username + "/" + user._files[i].name
                  });
                }
                s3.deleteObjects(s3params, function(err, data) {
                  if (err) res.status(500).json({msg: "server error"});
                  else {
                    s3.deleteBucket({Bucket: "colincolt/" + user.username}, function(err) {
                      if (err) res.status(500).json({msg: "server error"});
                      else {
                        File.remove({_userId: user._id}, function(err) {
                          if (err) res.status(500).json({msg: "server error"});
                          else {
                            User.remove({username: user.username}, function(err) {
                              res.json(user);
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }

            } else {
              res.status(404).json({msg: "no such user"});
            }
          }
        });
    });

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
          //Create the S3 bucket
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

};
