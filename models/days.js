const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const daysSchema = new Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  timings: [String],
  updatedBy: { type: String, required: true },
});

const Days = mongoose.model("Days", daysSchema, "days");

module.exports = Days;
