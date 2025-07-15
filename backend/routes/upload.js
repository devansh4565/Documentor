// backend/routes/upload.js
const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const dotenv = require('dotenv');
const File = require('../models/File'); // Ensure this path is correct

dotenv.config();

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).send({ message: 'Session ID is required.' });
  }

  try {
    const cloudinaryResult = await new Promise((resolve, reject) => {
      const fileName = path.parse(req.file.originalname).name;
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'pdfs',
          public_id: fileName,
          upload_preset: 'ml_default',
          resource_type: 'raw',
          access_mode: 'public',
          overwrite: true,
        },
        (error, result) => {
          // ✅ FIX: Properly check for errors within the result object too
          if (error || result.error) {
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
    });

    await newFile.save();
    res.status(200).json(newFile);

  } catch (error) {
    // ✅ FIX: Improved error logging to show the real cause
    console.error("🔴 Upload process failed. Reason:", error.message || error);
    res.status(500).json({ message: `Upload process failed: ${error.message || 'Unknown error'}` });
  }
});

module.exports = router;