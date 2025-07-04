// backend/models/ChatSession.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatSessionSchema = new Schema({
    name: {
        type: String,
        required: true,
        default: 'Untitled Session'
    },
    
    // --- THIS IS THE FIX ---
    // The 'user' field now stores the Firebase UID, which is a String.
    // It is no longer a reference to a different collection.
    user: {
        type: String,
        required: true,
        index: true // Adding an index makes querying by user faster
    }
    // -------------------------

}, {
    // Using the timestamps option is a Mongoose best practice.
    // It automatically adds `createdAt` and `updatedAt` fields.
    timestamps: true 
});

// This prevents a re-compilation error in some environments like Next.js
module.exports = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);