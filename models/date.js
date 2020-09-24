const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const dateSchema = new Schema({
  name: { type: String, required: true },
  availability: [{ 
    date: { type: Date, required: true },
    time: { type: Date, required: true }
  }],
});

const Date = mongoose.model("Date", dateSchema, "date");

module.exports = Date;
