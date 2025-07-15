// backend/models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    content: { type: String },
    user: { type: String, required: true } // ✅ This line is essential
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);