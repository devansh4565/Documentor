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
    user: { // ✅ ADD THIS REQUIRED FIELD
        type: String,
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.models.MindMapData || mongoose.model("MindMapData", mindMapDataSchema);