"use strict";
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
  username: "colincolt"
};

var newUser = {
  username: "garrettdieck"
}

var oldFile = {
  name: "potato"
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
      // Ensure indexing is done, so that unique usernames will be properly enforced
      User.ensureIndexes(function(err) {
        // Add oldFile as oldUser's file
        File.create(oldFile, function(err, file) {
          done();
        });
      });
    });
  });
  // Add sub-bucket for user created above
  before(function(done) {
    s3.createBucket({Bucket: "colincolt/" + oldUser.username}, function(err, data) {
      if (!err) {
        done();
      }
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
  // Delete oldUser sub-bucket created for the tests
  after(function(done) {
    s3.deleteBucket({Bucket: "colincolt/" + oldUser.username}, function(err, data) {
      done();
    });
  });
  // Delete newUser sub-bucket created for the tests
  after(function(done) {
    s3.deleteBucket({Bucket: "colincolt/" + newUser.username}, function(err, data) {
      done();
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
      it("should take JSON with unique username, persist in DB, and return the persisted User with status 201 (created)", function(done) {
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
            .get("/users/colincolt")
            .end(function(err,res) {
              expect(res).to.have.status(200);
              expect(res.body["username"]).to.eql(oldUser["username"]);
              done();
            });
        });
        it("should send 404 if no such user", function(done) {
          chai.request("http://localhost:3000")
            .get("/users/marccolt")
            .end(function(err,res) {
              expect(res).to.have.status(404);
              done();
            });
        });
      });
      //PUT request to /users/:user
      describe("PUT", function() {
        it("should ")
      });
      //DELETE request to /users/:user
      describe("DELETE", function() {

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
