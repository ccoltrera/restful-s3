"use strict";
var fs = require("fs");

var AWS = require("aws-sdk");
AWS.config.region = 'us-west-2';
var s3 = new AWS.S3();

var server = require(__dirname + "/../server");
var app = server.app;
var db = server.db;
var serverInst = server.serverInst;

var User = require(__dirname + "/../models/User");
var File = require(__dirname + "/../models/File");

var chai = require("chai");
var chaiHttp = require("chai-http");
var expect = chai.expect;

chai.use(chaiHttp);

var oldUser = {
  username: "oldUser"
};

var newUser = {
  username: "newUser"
};

var userToRename = {
  username: "userToRename"
};

var fileToRename = {
  name: "fileToRename"
};

var oldFile = {
  name: "oldFile"
};

describe("RESTful API with S3 Integration: ", function() {
  // Ensure tests wait until DB connection is open
  before(function(done) {
    db.once("open", function() {
      done();
    });
  });
  before(function(done) {
    // Add oldUser to the DB
    User.create(oldUser, function(err, user) {
      oldFile._userId = user._id;
      // Ensure indexing is done, so that unique _ids will be properly enforced
      User.ensureIndexes(function(err) {
        // Add oldFile as oldUser's file
        File.create(oldFile, function(err, file) {
          // Link oldUser to oldFile
          User.update({_id: user._id}, { $push: { _files: file._id }}, function(err) {
            if (!err) done();
          });
        });
      });
    });
  });

  before(function(done) {
    // Add userToRename to the DB
    User.create(userToRename, function(err, user) {
      fileToRename._userId = user._id;
      // Ensure indexing is done, so that unique _ids will be properly enforced
      User.ensureIndexes(function(err) {
        // Add fileToRename as userToRename's file
        File.create(fileToRename, function(err, file) {
          // Link userToRename to fileToRename
          User.update({_id: user._id}, { $push: { _files: file._id }}, function(err) {
            if (!err) done();
          });
        });
      });
    });
  });

  // Create file for delete testing
  before(function(done) {
    fs.writeFile("./oldFile.json", "potatopotatopotato", function(err) {
      if(!err) done();
    });
  });
  // Upload file for delete testing
  before(function(done) {
    var oldFileStream = fs.createReadStream("./oldFile.json");
    s3.putObject({
      Bucket: "colincolt",
      Key: oldUser.username + "/oldFile",
      Body: oldFileStream
    }, function(err, data) {
      if(!err) done();
    });
  });

  // Create file for rename testing
  before(function(done) {
    fs.writeFile("./fileToRename.json", "potatopotatopotato", function(err) {
      if(!err) done();
    });
  });
  // Upload file for rename testing
  before(function(done) {
    var fileStream = fs.createReadStream("./fileToRename.json");
    s3.putObject({
      Bucket: "colincolt",
      Key: userToRename.username + "/fileToRename",
      Body: fileStream
    }, function(err, data) {
      if(!err) done();
    });
  });

  // Wipe DB after the tests
  // Shut down server and DB connection
  after(function(done) {
    db.db.dropDatabase(function() {
      db.close();
      serverInst.close();
      done();
    });
  });

  // Delete fileToRename
  after(function(done) {
    s3.deleteObject({
      Bucket: "colincolt",
      Key: "renamedUser/fileToRename"
    }, function(err, data) {
      if (!err) {
        done()
      };
    });
  });
  // Unlink file created for tests
  after(function(done) {
    fs.unlink("oldFile.json", function(err) {
      if (!err) {
        done();
      }
    });
  });
  // Unlink file to rename created for tests
  after(function(done) {
    fs.unlink("fileToRename.json", function(err) {
      if (!err) {
        done();
      }
    });
  });

  describe("/users", function() {
    //GET request to /users
    describe("GET", function() {
      it("should send all users as JSON, with status 200", function(done) {
        chai.request("http://localhost:3000")
          .get("/users")
          .end(function(err, res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body[0]["username"]).to.eql(oldUser["username"]);
            done();
          });
      });
    });
    //POST request to /users
    describe("POST", function() {
      it("should take JSON with unique username, persist in DB, create S3 bucket, and return the persisted User with status 201 (created)", function(done) {
        chai.request("http://localhost:3000")
          .post("/users")
          .send(newUser)
          .end(function(err, res) {
            expect(res).to.have.status(201);
            expect(res).to.be.json;
            expect(res.body["username"]).to.eql(newUser["username"]);
            done();
          })
      });
      it("should respond with 409 (conflict) on duplicate username", function(done) {
        chai.request("http://localhost:3000")
          .post("/users")
          .send(oldUser)
          .end(function(err, res) {
            expect(res).to.have.status(409);
            done();
          });
      });
    });
    describe("/:user", function() {
      //GET request to /users/:user
      describe("GET", function() {
        it("should send an existent specified user as JSON", function(done) {
          chai.request("http://localhost:3000")
            .get("/users/oldUser")
            .end(function(err,res) {
              expect(res).to.have.status(200);
              expect(res.body["username"]).to.eql(oldUser["username"]);
              done();
            });
        });
        it("should send 404 if no such user", function(done) {
          chai.request("http://localhost:3000")
            .get("/users/fakeUser")
            .end(function(err,res) {
              expect(res).to.have.status(404);
              done();
            });
        });
      });
      //PUT request to /users/:user
      describe("PUT", function() {
        it("should rename a user in the database, and rename their bucket on S3", function(done) {
          chai.request("http://localhost:3000")
            .put("/users/userToRename")
            .send({username: "renamedUser"})
            .end(function(err,res) {
              expect(res).to.have.status(200);
              expect(res.body["username"]).to.eql("renamedUser");
              done();
            });
        });
      });
      //DELETE request to /users/:user
      describe("DELETE", function() {
        it("should delete a user, their bucket, and all their Files in the database", function(done) {
          chai.request("http://localhost:3000")
            .del("/users/oldUser")
            .end(function(err,res) {
              expect(res).to.have.status(200);
              expect(res.body["username"]).to.eql(oldUser["username"]);
              done();
            });
        });
      });

      describe("/files", function() {
        //GET request to /users/:user/files
        describe("GET", function() {
          it("should respond with information for all files owned by a user, as a JSON array", function(done) {
            chai.request("http://localhost:3000")
              .get("/users/renamedUser/files")
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.length).to.eql(1);
                done();
              });
          });
        });
        //POST request to /users/:user/files
        describe("POST", function() {
          it("should add a posted file to S3, under the user's username, and return the File doc from mongoose", function(done) {
            chai.request("http://localhost:3000")
              .post("/users/newUser/files")
              .send({name: "newFile", content:"oh my goodness, such content"})
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res.body.name).to.eql("newFile");
                done();
              });
          });
        });
        //DELETE request to /users/:user/files/
        describe("DELETE", function() {
          it("should delete all files of a user, in Mongo and S3, and return the user's updated doc", function(done) {
            chai.request("http://localhost:3000")
              .del("/users/newUser/files")
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res.body._files.length).to.eql(0);
                done();
              });
          });
        });

        describe("/:file", function() {
          //GET request to /users/:user/files/:file
          describe("GET", function() {

          });
          //PUT request to /users/:user/files/:file
          describe("PUT", function() {

          });
        });
      });
    });
  });
});
