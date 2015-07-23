"use strict";

var gulp = require("gulp");
var mocha = require("gulp-mocha");
var jshint = require("gulp-jshint");
var jscs = require("gulp-jscs");

gulp.task("default", ["test","lint","jscs"]);

gulp.task("test", function() {
  return gulp.src("./test/*test.js")
              .pipe(mocha({"reporter" : "progress"}));
});

gulp.task("lint", function() {
  return gulp.src(["./*.js", "./lib/*.js", "./test/*.js"])
              .pipe(jshint())
              .pipe(jshint.reporter("default"));
});

gulp.task("watch", function(){
  gulp.watch(["./*.js", "./lib/*.js", "./test/*.js"], ["test", "lint", "jscs"]);
});

gulp.task("jscs", function() {
  return gulp.src(["./*.js", "./lib/*.js", "./test/*.js"])
              .pipe(jscs());
});
