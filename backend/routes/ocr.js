// --- Start of backend/routes/ocr.js ---

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { recognize } = require("tesseract.js");
const pdf = require("pdf-poppler");

const UploadedFile = require("../models/UploadedFile");
const ChatSession = require("../models/ChatSession");
const { ensureAuth } = require("../routes/auth");
const router = express.Router();
const uploadDir = "uploads";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });


// ✅ THIS IS THE CRITICAL FIX: The route path is now "/"
router.post("/", upload.single("file"), ensureAuth ,async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    let sessionId = req.body.sessionId;
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      const newSession = await ChatSession.create({
        name: req.body.name || "Untitled Session",
        user: req.user.id // this is the key part
      });
      sessionId = newSession._id.toString();
      console.log(`✨ Created new session for upload: ${sessionId}`);
    } else {
      console.log(`📂 Adding file to existing session: ${sessionId}`);
    }

    const pdfPath = req.file.path;
    const originalName = req.file.originalname;
    const outputPath = path.join(uploadDir, `${Date.now()}`);
    fs.mkdirSync(outputPath, { recursive: true });

    await pdf.convert(pdfPath, { format: "png", out_dir: outputPath, out_prefix: "page" });
    const imageFiles = fs.readdirSync(outputPath).filter(f => f.endsWith(".png"));
    let fullText = "";
    for (const file of imageFiles) {
      const result = await recognize(path.join(outputPath, file), "eng");
      fullText += result.data.text + "\n";
    }

    const finalPath = path.join(__dirname, "../public/uploads", originalName);
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.copyFileSync(pdfPath, finalPath);
    
    fs.rmSync(outputPath, { recursive: true, force: true });
    fs.unlinkSync(pdfPath);

    const newFileInDB = await UploadedFile.create({
      name: originalName,
      size: `${(fullText.length / 1024).toFixed(2)} KB (OCR)`,
      url: `/uploads/${originalName}`,
      sessionId,
      user: req.user.id,
      content: fullText.trim(),
    });

  console.log("✅ OCR completed and saved. Returning full file document to frontend.");

    
    return res.json(newFileInDB);
  } catch (err) {
    console.error("❌ Server-side OCR failed:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "OCR processing failed." });
    }
  }
});

module.exports = router;
// --- End of backend/routes/ocr.js ---