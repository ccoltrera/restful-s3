var mongoose = require("mongoose");

var userSchema = new mongoose.Schema({
  username: {type: String, unique: true, validate: /\w\w+/},
  // File _id as an array
  _files: [{type: mongoose.Schema.Types.ObjectId, ref: "File"}]
});

var User = mongoose.model("User", userSchema);

module.exports = User;

// var aa = new User({_id: "aa"});
// aa.save(function(err, user) {
//   console.log(err);
//   console.log(user);
// })
