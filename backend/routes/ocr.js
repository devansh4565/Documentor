const express = require("express");
const multer = require("multer");
const os = require('os');
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const File = require("../models/File"); // ✅ FIX: Use the correct 'File' model
const ChatSession = require("../models/ChatSession");
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken'); // ✅ FIX: Use the correct Firebase middleware

const router = express.Router();
const uploadDir = path.join(os.tmpdir(), "documentor_uploads"); 
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Create the temporary upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  // Use a unique filename to prevent overwrites
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// The route is now protected by our Firebase middleware
// POST /api/ocr
router.post("/", upload.single("file"), verifyFirebaseToken, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let sessionId = req.body.sessionId;
    
    // ✅ FIX: Use req.user.uid from the Firebase token
    const userId = req.user.uid;

    // This logic to create a new session if one isn't provided is great.
    // Just needs the correct user ID.
    if (!sessionId || sessionId === "undefined" || sessionId === "null") {
      const newSession = await ChatSession.create({
        name: req.file.originalname, // A better default name for the session
        user: userId, // ✅ FIX: Use the correct user ID
      });
      sessionId = newSession._id.toString();
      console.log(`✨ Created new session for upload: ${sessionId}`);
    } else {
      console.log(`📂 Adding file to existing session: ${sessionId}`);
    }

    const tempPdfPath = req.file.path;
    const finalFilename = req.file.filename; // The unique filename from multer

    // Parse text from the uploaded PDF
    const dataBuffer = fs.readFileSync(tempPdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const fullText = pdfData.text;

    // Ensure the public uploads directory exists
    const publicUploadsDir = path.join(__dirname, "../public/uploads");
    fs.mkdirSync(publicUploadsDir, { recursive: true });
    
    // Move the file from the temp directory to the public directory
    const finalPath = path.join(publicUploadsDir, finalFilename);
    fs.renameSync(tempPdfPath, finalPath);

    // Create the new file document in the database
    const newFileInDB = await File.create({
      name: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      url: `/uploads/${finalFilename}`, // The publicly accessible URL
      sessionId,
      user: userId, // ✅ FIX: Use the correct user ID
      content: fullText.trim(),
    });

    console.log("✅ PDF parsed and file saved to DB.");
    res.status(201).json(newFileInDB);

  } catch (err) {
    console.error("❌ File upload or OCR failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error during file processing." });
    }
  }
});

module.exports = router;