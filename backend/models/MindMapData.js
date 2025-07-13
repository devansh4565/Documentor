const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mindMapDataSchema = new Schema({
    data: { type: Object, required: true },
    // This MUST be fileId to match your routes
    fileId: {
        type: Schema.Types.ObjectId,
        ref: 'File',
        required: true,
        unique: true,
        index: true,
    },
}, { timestamps: true });

module.exports = mongoose.models.MindMapData || mongoose.model("MindMapData", mindMapDataSchema);