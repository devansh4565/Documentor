const mongoose = require("mongoose");
const mindMapDataSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    data: { type: Object, required: true },
}, { timestamps: true });
module.exports = mongoose.model("MindMapData", mindMapDataSchema);