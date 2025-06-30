// models/File.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  name: String,
  size: String,
  sessionId: String,
});

module.exports = mongoose.model("File", fileSchema);
