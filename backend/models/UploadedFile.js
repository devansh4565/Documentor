const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema({
    name: String,
    size: String,
    url: String,
    content: String,
    sessionId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ✅ ADD THIS
}, { timestamps: true });

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);