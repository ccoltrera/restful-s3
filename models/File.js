var mongoose = require("mongoose");

var fileSchema = new mongoose.Schema({
  //Require name property, validate with regexp
  name: {type: String, required: true, validate: /\w+-?\w+/},
  //Require ownerId to match _id of existent User
  _userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true}
});

//Enforce only a single File with same name and ownerId
fileSchema.index({name: 1, _userId: 1}, {unique: true});

var File = mongoose.model("File", fileSchema);

module.exports = File;
