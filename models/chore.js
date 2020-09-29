const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const choreSchema = new Schema({
  name: { type: String, required: true },
  effort: { type: Number, required: true },
  frequency: { type: Number, required: true },
  person: { type: String },
  assignDate: { type: String },
});

const Chore = mongoose.model("Chore", choreSchema, "chore");

module.exports = Chore;
