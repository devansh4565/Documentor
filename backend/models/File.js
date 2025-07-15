// backend/models/File.js

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat', // Ensure 'Chat' is the correct name of your session model
        required: true
    },
    // You can add other fields here if needed, like 'content'
    // content: { type: String }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// ✅ THIS IS THE CRITICAL LINE
// It takes the schema and creates a model named 'File', then exports it.
module.exports = mongoose.model('File', fileSchema);