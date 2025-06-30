const mongoose = require("mongoose");
 
const OCRResultSchema = new mongoose.Schema({
  sessionId: String,
  filename: String,
  text: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
 
module.exports = mongoose.model("OCRResult", OCRResultSchema);