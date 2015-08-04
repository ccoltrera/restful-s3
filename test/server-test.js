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
  _id: "oldUser"
};

var newUser = {
  _id: "newUser"
}

var oldFile = {
  name: "oldFile"
}

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
      oldFile.userId = user._id;
      // Ensure indexing is done, so that unique _ids will be properly enforced
      User.ensureIndexes(function(err) {
        // Add oldFile as oldUser's file
        oldFile["_userId"] = user["_id"];
        File.create(oldFile, function(err, file) {
          // Link oldUser to oldFile
          //User.update({_id: user._id}, { $set: {  })
          done();
        });
      });
    });
  });
  // Add sub-bucket for user created above
  before(function(done) {
    s3.createBucket({Bucket: "colincolt/" + oldUser._id}, function(err, data) {
      if (!err) {
        done();
      }
    });
  });
  // Create file for testing
  before(function(done) {
    fs.writeFile("./oldFile.json", "potatopotatopotato", function(err) {
      if(!err) done();
    });
  });
  // Upload file for testing
  before(function(done) {
    var oldFileStream = fs.createReadStream("./oldFile.json");
    s3.putObject({
      Bucket: "colincolt/" + oldUser._id,
      Key: "oldFile",
      Body: oldFileStream
    }, function(err, data) {
      console.log("INSIDE")
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
  // Delete oldFile in oldUser's bucket
  after(function(done) {
    s3.deleteObject({
      Bucket: "colincolt/" + oldUser._id,
      Key: "oldFile"
    }, function(err, data) {
      if (!err) done();
    });
  });
  // Delete oldUser sub-bucket created for the tests
  after(function(done) {
    s3.deleteBucket({Bucket: "colincolt/" + oldUser._id}, function(err, data) {
      done();
    });
  });
  // Delete newUser sub-bucket created for the tests
  after(function(done) {
    s3.deleteBucket({Bucket: "colincolt/" + newUser._id}, function(err, data) {
      done();
    });
  });
  // Unlink file created for tests
  after(function(done) {
    fs.unlink("oldFile.json", function(err) {
      if (!err) done();
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
            expect(res.body[0]["_id"]).to.eql(oldUser["_id"]);
            done();
          });
      });
    });
    //POST request to /users
    describe("POST", function() {
      it("should take JSON with unique _id, persist in DB, create S3 bucket, and return the persisted User with status 201 (created)", function(done) {
        chai.request("http://localhost:3000")
          .post("/users")
          .send(newUser)
          .end(function(err, res) {
            expect(res).to.have.status(201);
            expect(res).to.be.json;
            expect(res.body["_id"]).to.eql(newUser["_id"]);
            done();
          })
      });
      it("should respond with 409 (conflict) on duplicate _id", function(done) {
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
              expect(res.body["_id"]).to.eql(oldUser["_id"]);
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

        });
      });
      //DELETE request to /users/:user
      describe("DELETE", function() {
        it("should delete a user, their bucket, and all their Files in the database", function(done) {
          chai.request("http://localhost:3000")
            .del("/users/oldUser")
            .end(function(err,res) {
              expect(res).to.have.status(200);
              expect(res.body["_id"]).to.eql(oldUser["_id"]);
              done();
            });
        });
      });

      describe("/files", function() {
        //GET request to /users/:user/files
        describe("GET", function() {

        });
        //POST request to /users/:user/files
        describe("POST", function() {

        });

        describe("/:file", function() {
          //GET request to /users/:user/files/:file
          describe("GET", function() {

          });
          //PUT request to /users/:user/files/:file
          describe("PUT", function() {

          });
          //DELETE request to /users/:user/files/:file
          describe("DELETE", function() {

          });
        });
      });
    });
  });
});
