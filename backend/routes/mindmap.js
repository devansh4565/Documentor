const express = require("express");
const router = express.Router();
const MindMapData = require("../models/MindMapData");
// We don't need ChatSession or the middleware for an unprotected setup.

// ❌ WARNING: These routes are unprotected. Anyone with a valid sessionId can access them.
// To re-enable security later:
// 1. Uncomment the verifyFirebaseToken import.
// 2. Uncomment `router.use(verifyFirebaseToken);`
// 3. Uncomment the security check blocks inside each route.
// const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
// router.use(verifyFirebaseToken);


// --- NEW ROUTE ---
// GET /api/mindmap/exists/:sessionId
// Checks if a mind map exists for a given session.
router.get("/exists/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // --- Security Check (Currently Disabled) ---
        // const userId = req.user.uid;
        // const session = await ChatSession.findOne({ _id: sessionId, user: userId });
        // if (!session) return res.status(403).json({ message: "Access denied." });
        
        const count = await MindMapData.countDocuments({ sessionId: sessionId });
        res.status(200).json({ exists: count > 0 });

    } catch (error) {
        console.error("Error checking mind map existence:", error);
        res.status(500).json({ error: "Server error." });
    }
});


// POST /api/mindmap/:sessionId - Save or update mind map data
router.post("/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;

        // --- Security Check (Currently Disabled) ---
        // const userId = req.user.uid;
        // const session = await ChatSession.findOne({ _id: sessionId, user: userId });
        // if (!session) return res.status(403).json({ message: "Access denied." });

        await MindMapData.findOneAndUpdate(
            { sessionId: sessionId },
            { data: req.body.data },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, message: "Mind map saved successfully." });
    } catch (err) {
        console.error("Error saving mind map:", err);
        res.status(500).json({ error: "Failed to save mind map." });
    }
});


// GET /api/mindmap/:sessionId - Get mind map data
router.get("/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // --- Security Check (Currently Disabled) ---
        // const userId = req.user.uid;
        // const session = await ChatSession.findOne({ _id: sessionId, user: userId });
        // if (!session) return res.status(403).json({ message: "Access denied." });

        const map = await MindMapData.findOne({ sessionId: sessionId });
        res.status(200).json(map ? map.data : null);
    } catch (err) {
        console.error("Error fetching mind map:", err);
        res.status(500).json({ error: "Failed to fetch mind map." });
    }
});

module.exports = router;