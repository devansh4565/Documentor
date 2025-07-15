const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const dotenv = require('dotenv');
const File = require('../models/File'); // 👈 Make sure this path to your File model is correct

dotenv.config();

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('file'), async (req, res) => { // 👈 Note: route is now async
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  // sessionId will come from the form data
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).send({ message: 'Session ID is required.' });
  }

  const fileName = path.parse(req.file.originalname).name;

  const uploadPromise = new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      {
        folder: 'pdfs',
        public_id: fileName,
        resource_type: 'raw',
        format: 'pdf',
        access_mode: 'public', // Ensure file is publicly accessible
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });

  try {
    const cloudinaryResult = await uploadPromise;

    // Now, create a new document in your database
    const newFile = new File({
      name: req.file.originalname,
      url: cloudinaryResult.secure_url, // Use the secure URL from Cloudinary
      sessionId: sessionId,
      // Add other fields like 'content' if you extract text on the backend
    });

    await newFile.save();

    // ✅ Respond with the complete file object from the database
    res.status(200).json(newFile);

  } catch (error) {
    console.error('Upload process failed:', error);
    res.status(500).send({ message: 'Upload process failed', error });
  }
});

module.exports = router;