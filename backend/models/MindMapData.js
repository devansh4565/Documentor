const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mindMapDataSchema = new Schema({
    // The mind map's hierarchical data structure
    data: {
        type: Object,
        required: true,
    },

    // --- THIS IS THE FIX ---
    // Change `sessionId` to `fileId` and make it a proper reference.
    fileId: {
        type: Schema.Types.ObjectId,
        ref: 'File', // This creates a formal link to your File model
        required: true,
        unique: true, // A file can only have one mind map
        index: true,  // Speeds up lookups by fileId
    },
    // -------------------------

}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.models.MindMapData || mongoose.model("MindMapData", mindMapDataSchema);