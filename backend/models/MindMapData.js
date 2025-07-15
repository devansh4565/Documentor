const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mindMapDataSchema = new Schema({
    data: { type: Object, required: true },
    fileId: {
        type: Schema.Types.ObjectId,
        ref: 'File',
        required: true,
        unique: true,
        index: true,
    },
    user: {
        type: String,
        required: true
    },
}, { timestamps: true });

// ✅ Use the standard export format to prevent silent errors
module.exports = mongoose.model("MindMapData", mindMapDataSchema);