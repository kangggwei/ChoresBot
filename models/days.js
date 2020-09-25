const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const daysSchema = new Schema({
  name: { type: String, required: true },
  availability: [Date],
});

const Days = mongoose.model("Days", daysSchema, "days");

module.exports = Days;
