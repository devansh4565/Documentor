const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const UploadedFile = require("../models/UploadedFile");
const { ensureAuth } = require("./auth");

router.get("/:sessionId", ensureAuth, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Only use ObjectId if your DB stores sessionId as ObjectId
    const files = await UploadedFile.find({ sessionId }); // ← no conversion

    res.status(200).json({ files });
  } catch (err) {
    console.error("❌ Error fetching files:", err.message);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});


module.exports = router;
