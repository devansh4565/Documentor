const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

// Import your Mongoose models
const File = require("../models/File");
const ChatSession = require("../models/ChatSession");

// Import your authentication middleware
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

// ✅ STEP 1: Import the Cloudinary storage configuration
const { storage } = require('../config/cloudinary');

const router = express.Router();

// ✅ STEP 2: Tell multer to use our Cloudinary storage engine
const upload = multer({ storage: storage });


// --- THE NEW CLOUDINARY UPLOAD ROUTE ---
// POST /api/upload
// The middleware order is critical: verify the token first, THEN let multer upload.
router.post("/", verifyFirebaseToken, upload.single("file"), async (req, res) => {
  try {
    // 1. Validate the upload
    if (!req.file) {
      return res.status(400).json({ error: "No file or file upload failed." });
    }
    // `req.user` is attached by `verifyFirebaseToken` which ran before multer
    const userId = req.user.uid; 
    let sessionId = req.body.sessionId;

    // The file has already been uploaded to Cloudinary by the middleware!
    // The URL is in `req.file.path`. The size is in `req.file.size`.
    console.log("✅ File successfully uploaded to Cloudinary:", req.file.path);

    // 2. Create a new session if one wasn't provided
    if (!sessionId || sessionId === "undefined" || sessionId === "null") {
      const newSession = await ChatSession.create({
        name: req.file.originalname,
        user: userId,
      });
      sessionId = newSession._id.toString();
    }
    
    // 3. To get the text content, we must fetch the PDF from Cloudinary's URL
    const response = await fetch(req.file.path);
    if (!response.ok) {
        throw new Error('Failed to fetch uploaded file from Cloudinary for parsing.');
    }
    const buffer = await response.arrayBuffer();
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    // 4. Create the file record in our database with the Cloudinary URL
    const newFileInDB = await File.create({
      name: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      // ✅ Use the secure URL provided by Cloudinary
      url: req.file.path, 
      sessionId: sessionId,
      user: userId,
      content: fullText.trim(),
    });

    res.status(201).json(newFileInDB);

  } catch (err) {
    console.error("❌ Cloudinary upload route failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error during file processing." });
    }
  }
});

module.exports = router;