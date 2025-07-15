// backend/routes/mindmap.js
const express = require("express");
const router = express.Router();
const MindMapData = require("../models/MindMapData");
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken'); // ✅ 1. Import authentication

// ✅ 2. Apply authentication to all mind map routes
router.use(verifyFirebaseToken);

// GET /api/mindmap/exists/file/:fileId
router.get("/exists/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        // ✅ 3. Only check for mind maps belonging to the logged-in user
        const count = await MindMapData.countDocuments({ fileId: fileId, user: req.user.uid });
        res.status(200).json({ exists: count > 0 });
    } catch (error) {
        res.status(500).json({ error: "Server error." });
    }
});

// POST /api/mindmap/file/:fileId
router.post("/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.uid; // Get the user's ID

        // ✅ 4. Find by fileId AND userId, and save the userId with the data
        const mindMap = await MindMapData.findOneAndUpdate(
            { fileId: fileId, user: userId },
            { data: req.body.data, fileId: fileId, user: userId },
            { upsert: true, new: true }
        );
        res.status(200).json(mindMap);
    } catch (err) {
        res.status(500).json({ error: "Failed to save mind map." });
    }
});

// GET /api/mindmap/file/:fileId
router.get("/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        // ✅ 5. Only find mind maps belonging to the logged-in user
        const map = await MindMapData.findOne({ fileId: fileId, user: req.user.uid });
        res.status(200).json(map ? map.data : null);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch mind map." });
    }
});

module.exports = router;