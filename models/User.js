var mongoose = require("mongoose");

var userSchema = new mongoose.Schema({
  username: {type: String, unique: true, required: true, validate: /\w\w+/, index: true}
});

var User = mongoose.model("User", userSchema);

module.exports = User;

// var aa = new User({username: "aa"});
// aa.save(function(err, user) {
//   console.log(err);
//   console.log(user);
// })
