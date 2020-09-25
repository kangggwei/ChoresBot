const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const choreSchema = new Schema({
  name: { type: String, required: true },
  time: { type: Number, required: true },
  effort: { type: Number, required: true },
  people: { type: Number, required: true },
  frequency: { type: Number, required: true },
});

const Chore = mongoose.model("Chore", choreSchema, "chore");

module.exports = Chore;
