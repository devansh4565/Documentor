const express = require("express");
const router = express.Router();
const MindMapData = require("../models/MindMapData");

// POST /api/mindmap/:sessionId - Save mind map data
router.post("/:sessionId", async (req, res) => {
    try {
        await MindMapData.findOneAndUpdate(
            { sessionId: req.params.sessionId },
            { data: req.body.data },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to save map." }); }
});

// GET /api/mindmap/:sessionId - Get mind map data
router.get("/:sessionId", async (req, res) => {
    try {
        const map = await MindMapData.findOne({ sessionId: req.params.sessionId });
        res.json(map ? map.data : null);
    } catch (err) { res.status(500).json({ error: "Failed to fetch map." }); }
});

module.exports = router;