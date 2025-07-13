const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier'); // We need this small helper library

const File = require("../models/File");
const ChatSession = require("../models/ChatSession");
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// This is a helper function to wrap the Cloudinary stream upload in a Promise
const streamUpload = (req) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            {
                folder: "documentor_uploads",
                // Generate a unique public_id (filename)
                public_id: `${req.user.uid}-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`,
                resource_type: "auto"
            },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
};


// POST /api/upload
router.post("/", verifyFirebaseToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const userId = req.user.uid;
    let sessionId = req.body.sessionId;

    // --- NEW UPLOAD LOGIC ---
    const cloudinaryResult = await streamUpload(req);
    console.log("✅ File successfully uploaded via stream:", cloudinaryResult.secure_url);

    const pdfData = await pdfParse(req.file.buffer);
    const fullText = pdfData.text;

    if (!sessionId) {
        const newSession = await ChatSession.create({ name: req.file.originalname, user: userId });
        sessionId = newSession._id.toString();
    }

    const newFileInDB = await File.create({
      name: req.file.originalname,
      url: cloudinaryResult.secure_url,
      sessionId: sessionId,
      user: userId,
      content: fullText.trim(),
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
    });

    res.status(201).json(newFileInDB);

  } catch (err) {
    console.error("❌ UPLOAD ROUTE FAILED:", err);
    res.status(500).json({ error: "Server error during file upload." });
  }
});

module.exports = router;