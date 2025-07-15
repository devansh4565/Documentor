// backend/routes/upload.js
const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const dotenv = require('dotenv');
const pdf = require('pdf-parse');
const File = require('../models/File');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

dotenv.config();

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', verifyFirebaseToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }

  try {
    const pdfData = await pdf(req.file.buffer);
    const extractedText = pdfData.text;

    const cloudinaryResult = await new Promise((resolve, reject) => {
      const originalName = path.parse(req.file.originalname).name;
      // ✅ FIX: Sanitize the filename to remove invalid characters
      const fileName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_');

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'pdfs',
          public_id: fileName,
          upload_preset: 'ml_default',
          resource_type: 'raw',
          access_mode: 'public',
          overwrite: true,
          async: false,
        },
        (error, result) => {
          if (error || result?.error) {
            return reject(error || new Error(result.error.message));
          }
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const newFile = new File({
      name: req.file.originalname,
      url: cloudinaryResult.secure_url,
      sessionId: sessionId,
      content: extractedText,
      user: req.user.uid,
    });

    await newFile.save();
    res.status(200).json(newFile);

  } catch (error) {
    console.error("🔴 Upload process failed. Reason:", error.message || error);
    res.status(500).json({ message: `Upload process failed: ${error.message || 'Unknown error'}` });
  }
});

module.exports = router;