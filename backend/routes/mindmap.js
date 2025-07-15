// backend/routes/mindmap.js
const express = require("express");
const router = express.Router();
const MindMapData = require("../models/MindMapData");
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

router.use(verifyFirebaseToken);

// ... (your GET routes can remain the same) ...
router.get("/exists/file/:fileId", async (req, res) => {
    try {
        const count = await MindMapData.countDocuments({ fileId: req.params.fileId, user: req.user.uid });
        res.status(200).json({ exists: count > 0 });
    } catch (error) {
        console.error("Error checking mind map existence:", error);
        res.status(500).json({ message: "Server error." });
    }
});

router.get("/file/:fileId", async (req, res) => {
    try {
        const map = await MindMapData.findOne({ fileId: req.params.fileId, user: req.user.uid });
        res.status(200).json(map ? map.data : null);
    } catch (err) {
        console.error("Error fetching mind map:", err);
        res.status(500).json({ message: "Failed to fetch mind map." });
    }
});


// POST /api/mindmap/file/:fileId - Saves a new mind map
router.post("/file/:fileId", async (req, res, next) => { // ✅ Added 'next'
    try {
        const { fileId } = req.params;
        const userId = req.user.uid;
        
        const mindMap = await MindMapData.findOneAndUpdate(
            { fileId: fileId, user: userId },
            { data: req.body.data, fileId: fileId, user: userId },
            { upsert: true, new: true, runValidators: true } // Added runValidators
        );
        
        res.status(200).json(mindMap);

    } catch (err) {
        // ✅ THIS IS THE FIX: Log the actual error to the console
        console.error("❌ Error saving mind map to database:", err); 
        next(err); // Pass the error to the global error handler in index.js
    }
});


module.exports = router;