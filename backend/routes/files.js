const express = require('express');
const router = express.Router();
const File = require('../models/File');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

// Apply auth middleware to all routes in this file
router.use(verifyFirebaseToken);

// --- THIS IS THE NEW ROUTE THAT FIXES THE BUG ---
// GET /api/files/:sessionId
// Fetches all files associated with a specific chat session for the logged-in user.
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.uid;

        const files = await File.find({
            sessionId: sessionId,
            user: userId // Ensures users can only get their own files
        });

        res.status(200).json(files); // Send the array of files back

    } catch (error) {
        console.error('Error fetching files for session:', error);
        res.status(500).json({ message: 'Server error while fetching files.' });
    }
});

module.exports = router;