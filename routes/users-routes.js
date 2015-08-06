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
  router.route("/:user/files/:file")
    .get(function(req, res) {

    })
    .put(function(req, res) {

    });

  // methods for /users/:user/files
  router.route("/:user/files")
    .get(function(req, res) {
      User.findOne({username: req.params.user})
        .populate("_files")
        .exec(function(err, user) {
          if (err) res.status(500).json({msg: "server error"});
          else {
            res.json(user._files)
          }
        });
    })
    .post(function(req, res) {
      User.findOne({username: req.params.user})
        .exec(function(err, userDoc) {
          if (err) res.status(500).json({msg: "server error"});
          else {
            File.create({name: req.body.name, _userId: userDoc._id}, function(err, fileDoc) {
              if (err) res.status(500).json({msg: "server error"});
              else {
                userDoc._files.push(fileDoc._id);
                userDoc.save(function(err) {
                  if (err) res.status(500).json({msg: "server error"});
                  else {
                    s3.putObject({
                      Bucket: "colincolt",
                      Key: req.params.user + "/" + req.body.name,
                      Body: req.body.content
                    }, function(err, data) {
                      if(err) res.status(500).json({msg: "server error"});
                      else {
                        res.send(fileDoc);
                      }
                    });
                  }
                });
              }
            });
          }
        });
    })
    .delete(function(req, res) {
      User.findOne({username: req.params.user})
      .populate("_files")
      .exec(function(err, userDoc) {
        var s3params = {
          Bucket: "colincolt",
          Delete: {
            Objects:[]
          }
        };
        for (var i = 0; i< userDoc._files.length; i++) {
          s3params["Delete"]["Objects"].push({
            Key: userDoc.username + "/" + userDoc._files[i].name
          });
        }
        s3.deleteObjects(s3params, function(err, data) {
          if (err) res.status(500).json({msg: "server error"});
          else {
            File.remove({_userId: userDoc._id}, function(err) {
              if (err) res.status(500).json({msg: "server error"});
              else {
                userDoc._files = [];
                userDoc.save(function(err) {
                  if (err) res.status(500).json({msg: "server error"});
                  else {
                    res.send(userDoc);
                  }
                });
              }
            });
          }
        });
      });
    });

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
      var oldUsername = req.params.user;
      var newUsername = req.body.username;
      var filesToRename = [];
      var filesCopied = 0;

      User.findOne({username: req.params.user})
        .populate("_files")
        .exec(function(err, user) {
          filesToRename = user._files;
          User.update({username: oldUsername}, {username: newUsername}, function(err) {
            if (err) res.status(500).json({msg: "server error"});
            else { ee.emit("userRenamed") }
          });
        });


      ee.on("userRenamed", function() {
        for (var i = 0; i < filesToRename.length; i++) {
          s3.copyObject({
            Bucket: "colincolt",
            CopySource: "colincolt/" + oldUsername + "/" + filesToRename[i].name,
            Key: newUsername + "/" + filesToRename[i].name,
          }, function(err) {
            if (err) res.status(500).json({msg: "server error"});
            else {
              filesCopied ++;
              if (filesCopied === filesToRename.length) {
                ee.emit("filesCopied");
              }
            }
          });
        }
      });
      ee.on("filesCopied", function() {
        // Iterate over file names, adding them to s3params
        var s3params = {
          Bucket: "colincolt",
          Delete: {
            Objects:[]
          }
        }
        for (var j = 0; j < filesToRename.length; j++) {
          s3params["Delete"]["Objects"].push({
            Key: oldUsername + "/" + filesToRename[j].name
          })
        }
        s3.deleteObjects(s3params, function(err, data) {
          if (err) res.status(500).json({msg: "server error"});
          else {
            User.findOne({username: newUsername}, function(err, userDoc) {
              if (err) res.status(500).json({msg: "server error"});
              else {
                res.json(userDoc);
              }
            });
          }
        });
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
                Bucket: "colincolt",
                Delete: {
                  Objects:[]
                }
              };
              // Check if user has files to be deleted
              if (user._files.length === 0) {
                User.remove({username: user.username}, function(err) {
                  res.json(user);
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
          res.status(201).json(user);
        }
      });
    });

};
