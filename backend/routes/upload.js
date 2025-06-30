const express = require("express");
const router = express.Router();
const UploadedFile = require("../models/UploadedFile");
const File = require("../models/File");

router.get("/files/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const [uploadedFiles, ocrFiles] = await Promise.all([
      File.find({ sessionId }),
      OCRResult.find({ sessionId })
    ]);

    const formattedOCR = ocrFiles.map((f) => ({
      name: f.filename,
      size: `${(f.text.length / 1024).toFixed(2)} KB (OCR)`,
      content: f.text,
    }));

    res.json({ files: [...uploadedFiles, ...formattedOCR] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// POST /api/upload
router.post("/upload", async (req, res) => {
  try {
    const { name, size, sessionId } = req.body;

    console.log("📥 Received upload:", req.body); // 👈 Add this

    const newFile = new File({ name, size, sessionId });
    await newFile.save();

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "Failed to save file." });
  }
});


module.exports = router;
