const express = require("express");
const router = express.Router();
const MindMapData = require("../models/MindMapData");
// We no longer need verifyFirebaseToken if these routes are unprotected.

// --- NEW ROUTE for file-specific check ---
// GET /api/mindmap/exists/file/:fileId
router.get("/exists/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        const count = await MindMapData.countDocuments({ fileId: fileId });
        res.status(200).json({ exists: count > 0 });
    } catch (error) {
        res.status(500).json({ error: "Server error." });
    }
});

// --- NEW ROUTE for saving a file-specific map ---
// POST /api/mindmap/file/:fileId
router.post("/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        await MindMapData.findOneAndUpdate(
            { fileId: fileId },
            { data: req.body.data, fileId: fileId },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to save mind map." });
    }
});

// --- NEW ROUTE for getting a file-specific map ---
// GET /api/mindmap/file/:fileId
router.get("/file/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        const map = await MindMapData.findOne({ fileId: fileId });
        res.status(200).json(map ? map.data : null);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch mind map." });
    }
});

module.exports = router;