// in backend/models/Highlight.js

const mongoose = require("mongoose");

const highlightSchema = new mongoose.Schema({
  // This links the highlights to a specific chat session
  sessionId: {
    type: String,
    required: true,
    unique: true, // Each session can only have one set of highlights
  },
  // This will be an array of words or phrases to highlight
  highlights: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model("Highlight", highlightSchema);