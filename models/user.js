const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userID: { type: String, required: true },
  username: { type: String, required: true },
  points: { type: Number, required: true },
  date: { type: Schema.Types.Mixed, required: true },
  available: { type: Boolean, required: true },
});

const User = mongoose.model("User", userSchema, "user");

module.exports = User;
