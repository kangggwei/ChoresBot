const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const historySchema = new Schema({
  name: { type: String, required: true },
  assignDate: { type: String, required: true },
  completeDate: { type: String, required: true },
  person: { type: String, required: true },
});

const History = mongoose.model("History", historySchema, "history");

module.exports = History;
