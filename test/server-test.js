"use strict";
var server = require(__dirname + "/../server");
var app = server.app;
var db = server.db;
var server = server.db;

var User = require(__dirname + "/../models/User");
var File = require(__dirname + "/../models/File");

var chai = require("chai");
var chaiHttp = require("chai-http");
var expect = chai.expect;

chai.use(chaiHttp);

var oldUser = {
  username: "colincolt"
};

var oldFile = {
  name: "potato"
}

describe("RESTful API with S3 Integration", function() {
  // Ensure tests wait until DB connection is open
  before(function(done) {
    db.once("open", function() {
      done();
    });
  });
  // Wipe DB before each test
  beforeEach(function(done) {
    db.db.dropDatabase(function() {
      // Add oldUser to the DB
      User.create(oldUser, function(err, user) {
        oldFile.userId = user._id;
        // Add oldFile as oldUser's file
        File.create(oldFile, function(err, file) {
          done();
        });
      });
    });
  });
  //  Shut down server and DB connection
  after(function(done) {
    db.close();
    db.db.shutdownServer({timeoutSecs: 60})
    server.close();
    done();
  });
  describe("/users", function() {
    //GET request to /users
    describe("GET", function() {
      it("", function() {
        expect(true).to.equal(true);
      })
    });
    //POST request to /users
    describe("POST", function() {

    });
    describe("/:user", function() {
      //GET request to /users/:user
      describe("GET", function() {

      });
      //PUT request to /users/:user
      describe("PUT", function() {

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
