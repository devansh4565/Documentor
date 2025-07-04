// backend/models/File.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FileSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    size: {
        type: String, // Keeping as String since original was String
    },
    url: { // You need a field to store the path to the file on your server/cloud
        type: String,
        required: true,
    },
    content: { // This is where you will store the extracted text from OCR
        type: String,
        default: ''
    },

    // --- THIS IS THE FIX ---

    // 1. Add a required `user` field to store the Firebase UID.
    user: {
        type: String,
        required: true,
        index: true, // Index for faster lookups
    },

    // 2. Correctly type and reference the sessionId.
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'ChatSession', // Creates a link to the ChatSession model
        required: true,
    },
    // -------------------------

}, {
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.models.File || mongoose.model('File', FileSchema);