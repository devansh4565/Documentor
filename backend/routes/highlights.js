// in backend/routes/highlights.js

const express = require("express");
const router = express.Router();
const Highlight = require("../models/Highlight");

// POST /api/highlights - Save or Update highlights for a session
router.post("/", async (req, res) => {
  const { sessionId, highlights } = req.body;

  if (!sessionId || !highlights) {
    return res.status(400).json({ error: "sessionId and highlights are required." });
  }

  try {
    // This is an "upsert": it will update the record if it exists,
    // or create a new one if it doesn't. This is perfect for our needs.
    const updatedHighlightDoc = await Highlight.findOneAndUpdate(
      { sessionId: sessionId }, // Find by sessionId
      { highlights: highlights }, // Set the new highlights
      { upsert: true, new: true, setDefaultsOnInsert: true } // Options
    );
    res.status(200).json({ success: true, data: updatedHighlightDoc });
  } catch (err) {
    console.error("Error saving highlights:", err);
    res.status(500).json({ error: "Failed to save highlights." });
  }
});

// GET /api/highlights/:sessionId - Get highlights for a specific session
router.get("/:sessionId", async (req, res) => {
  try {
    const highlightDoc = await Highlight.findOne({ sessionId: req.params.sessionId });
    if (!highlightDoc) {
      // If no highlights are found, return an empty array to prevent frontend errors.
      return res.json({ highlights: [] });
    }
    res.json({ highlights: highlightDoc.highlights });
  } catch (err) {
    console.error("Error fetching highlights:", err);
    res.status(500).json({ error: "Failed to fetch highlights." });
  }
});

module.exports = router;