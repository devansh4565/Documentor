const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cloudinary = require('cloudinary').v2; // Import cloudinary v2

// Import your Mongoose models
const File = require("../models/File");
const ChatSession = require("../models/ChatSession");
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

// --- THE FIX: Use Memory Storage ---
// This tells multer to hold the uploaded file in memory as a buffer,
// instead of saving it to a temporary file on disk.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// ------------------------------------

// POST /api/upload
router.post("/", verifyFirebaseToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const userId = req.user.uid;
    let sessionId = req.body.sessionId;

    // --- NEW, SIMPLIFIED UPLOAD & PARSING LOGIC ---

    // 1. Upload the file buffer from memory directly to Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'auto',
        folder: 'documentor_uploads',
        public_id: `${userId}-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    });
    console.log("✅ File successfully uploaded to Cloudinary:", cloudinaryResponse.secure_url);

    // 2. Parse the PDF text directly from the buffer we already have in memory.
    // No need to re-download the file!
    const pdfData = await pdfParse(req.file.buffer);
    const fullText = pdfData.text;

    // 3. Create a new session if needed
    if (!sessionId || sessionId === "undefined" || sessionId === "null") {
        const newSession = await ChatSession.create({ name: req.file.originalname, user: userId });
        sessionId = newSession._id.toString();
    }

    // 4. Create the file record in our database
    const newFileInDB = await File.create({
      name: req.file.originalname,
      url: cloudinaryResponse.secure_url, // Use the secure URL from Cloudinary's response
      sessionId: sessionId,
      user: userId,
      content: fullText.trim(),
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
    });

    res.status(201).json(newFileInDB);

  } catch (err) {
    console.error("❌ Upload route failed:", err);
    res.status(500).json({ error: "Server error during file processing." });
  }
});

module.exports = router;