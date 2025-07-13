const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const File = require("../models/File");
const ChatSession = require("../models/ChatSession");
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

// --- Multer Configuration ---
const uploadDir = "uploads"; // This is a temporary storage location
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer saves the file with a temporary, unique name to prevent conflicts
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


// POST /api/upload
router.post("/", upload.single("file"), verifyFirebaseToken, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!req.user?.uid) return res.status(401).json({ error: "Authentication failed."});

    const userId = req.user.uid;
    let sessionId = req.body.sessionId;

    if (!sessionId || sessionId === "undefined" || sessionId === "null") {
      const newSession = await ChatSession.create({
        name: req.file.originalname,
        user: userId,
      });
      sessionId = newSession._id.toString();
    }

    // --- THIS IS THE CORRECTED LOGIC ---
    const tempPdfPath = req.file.path; // The path to the temp file, e.g., 'uploads/175...-report.pdf'

    // 1. Sanitize the original filename to make it URL-safe
    const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    // 2. Create the new, permanent, user-specific filename
    const finalFilename = `${userId}-${safeOriginalName}`;

    // 3. Define the final destination path for the file
    const publicUploadsDir = path.join(__dirname, "../public/uploads");
    fs.mkdirSync(publicUploadsDir, { recursive: true });
    const finalPath = path.join(publicUploadsDir, finalFilename);

    // 4. Move the temporary file to the public directory WITH the new name
    fs.renameSync(tempPdfPath, finalPath);
    // ------------------------------------

    // 5. Process the PDF text from the final location
    const dataBuffer = fs.readFileSync(finalPath);
    const pdfData = await pdfParse(dataBuffer);
    const fullText = pdfData.text;

    // 6. Create the database record using the new final filename for the URL
    const newFileInDB = await File.create({
      name: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      url: `/uploads/${finalFilename}`, // ✅ Now using the user-specific URL
      sessionId,
      user: userId,
      content: fullText.trim(),
    });

    console.log(`✅ File saved as ${finalFilename} and linked to DB.`);
    res.status(201).json(newFileInDB);

  } catch (err) {
    console.error("❌ File upload failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error during file processing." });
    }
  }
});

module.exports = router;