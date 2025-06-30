// --- Start of backend/routes/ocr.js ---

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse"); // ✅ replaces pdf-poppler + tesseract
const UploadedFile = require("../models/UploadedFile");
const ChatSession = require("../models/ChatSession");
const { ensureAuth } = require("./auth"); // ✅ correct path to middleware

const router = express.Router();
const uploadDir = "uploads";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// ✅ Server-safe OCR using pdf-parse
router.post("/", upload.single("file"), ensureAuth, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let sessionId = req.body.sessionId;
    if (!sessionId || sessionId === "undefined" || sessionId === "null") {
      const newSession = await ChatSession.create({
        name: req.body.name || "Untitled Session",
        user: req.user.id,
      });
      sessionId = newSession._id.toString();
      console.log(`✨ Created new session for upload: ${sessionId}`);
    } else {
      console.log(`📂 Adding file to existing session: ${sessionId}`);
    }

    const pdfPath = req.file.path;
    const originalName = req.file.originalname;

    // ✅ Parse text from PDF using pdf-parse
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const fullText = pdfData.text;

    // Save file to public/uploads so frontend can access it
    const finalPath = path.join(__dirname, "../public/uploads", originalName);
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.copyFileSync(pdfPath, finalPath);
    fs.unlinkSync(pdfPath); // remove temp file

    const newFileInDB = await UploadedFile.create({
      name: originalName,
      size: `${(fullText.length / 1024).toFixed(2)} KB (Parsed)`,
      url: `/uploads/${originalName}`,
      sessionId,
      user: req.user.id,
      content: fullText.trim(),
    });

    console.log("✅ PDF parsed and saved to DB.");
    return res.json(newFileInDB);
  } catch (err) {
    console.error("❌ PDF parsing failed:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "PDF parsing failed." });
    }
  }
});

module.exports = router;
// --- End of backend/routes/ocr.js ---
