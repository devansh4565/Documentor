const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cloudinary = require('cloudinary').v2;
const File = require("../models/File");
const ChatSession = require("../models/ChatSession");
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/", verifyFirebaseToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const userId = req.user.uid;
    let sessionId = req.body.sessionId;

    // Convert file buffer to a Data URI for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // --- THIS IS THE FIX ---
    const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'auto',
        folder: 'documentor_uploads',
        // Make the upload public. This is often the default, but being explicit is safer.
        type: 'upload', 
        public_id: `${userId}-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-_]/g, '')}`
    });
    // -------------------------

    console.log("✅ File uploaded to Cloudinary:", cloudinaryResponse.secure_url);

    const pdfData = await pdfParse(req.file.buffer);
    const fullText = pdfData.text;

    if (!sessionId || sessionId === "undefined" || sessionId === "null") {
        const newSession = await ChatSession.create({ name: req.file.originalname, user: userId });
        sessionId = newSession._id.toString();
    }

    const newFileInDB = await File.create({
      name: req.file.originalname,
      url: cloudinaryResponse.secure_url,
      sessionId: sessionId,
      user: userId,
      content: fullText.trim(),
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
    });

    // ✅ FIX: Ensure you are sending the created DB record back to the frontend.
    res.status(201).json(newFileInDB); 

  } catch (err) {
    console.error("❌ UPLOAD ROUTE CRASH:", err);
    res.status(500).json({ error: "Server error during file processing." });
  }
});

module.exports = router;