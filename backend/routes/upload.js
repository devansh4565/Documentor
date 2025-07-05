const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

// Import your Mongoose models
const File = require("../models/File");
const ChatSession = require("../models/ChatSession");

// Import ONLY the Firebase authentication middleware
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

// --- Multer Configuration ---
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


// --- THE NEW, ISOLATED UPLOAD ROUTE ---
// The path will be POST /api/upload
router.post("/", upload.single("file"), verifyFirebaseToken, async (req, res) => {
  try {
    // 1. Validate the request
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // The verifyFirebaseToken middleware has already run and attached req.user
    if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "Authentication failed."});
    }

    let sessionId = req.body.sessionId;
    const userId = req.user.uid; // Get the Firebase UID

    // 2. Create a new session if one is not provided
    if (!sessionId || sessionId === "undefined" || sessionId === "null") {
      const newSession = await ChatSession.create({
        name: req.file.originalname,
        user: userId, // Use the Firebase UID
      });
      sessionId = newSession._id.toString();
      console.log(`✨ Created new session for upload: ${sessionId}`);
    } else {
      console.log(`📂 Adding file to existing session: ${sessionId}`);
    }

    // 3. Process the PDF file
    const tempPdfPath = req.file.path;
    const finalFilename = req.file.filename;

    const dataBuffer = fs.readFileSync(tempPdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const fullText = pdfData.text;

    // 4. Move file to public directory
    const publicUploadsDir = path.join(__dirname, "../public/uploads");
    fs.mkdirSync(publicUploadsDir, { recursive: true });
    const finalPath = path.join(publicUploadsDir, finalFilename);
    fs.renameSync(tempPdfPath, finalPath);

    // 5. Create the file record in the database
    const newFileInDB = await File.create({
      name: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      url: `/uploads/${finalFilename}`,
      sessionId,
      user: userId, // Use the Firebase UID
      content: fullText.trim(),
    });

    console.log("✅ PDF parsed and file saved to DB.");
    res.status(201).json(newFileInDB);

  } catch (err) {
    console.error("❌ File upload failed in /api/upload:", err);
    // Important: check if headers were already sent before sending a response
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error during file processing." });
    }
  }
});

module.exports = router;