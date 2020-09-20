const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  points: { type: Number, required: true },
});

const User = mongoose.model("User", userSchema, "user");

module.exports = User;
