import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('file'), (req, res) => {
  // --- DEBUGGING LOG #1: Check received file info ---
  console.log('--- Received file information ---');
  console.log(req.file);
  console.log('---------------------------------');

  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  // --- DEBUGGING LOG #2: Check the file buffer ---
  // This shows us the raw data of the file received by the server.
  console.log('--- Checking File Buffer ---');
  console.log('File buffer size:', req.file.buffer.length);
  console.log('File buffer (first 100 bytes):', req.file.buffer.slice(0, 100).toString('hex'));
  console.log('--------------------------');


  let stream = cloudinary.uploader.upload_stream(
    {
      folder: 'pdfs',
      resource_type: 'raw', // Use 'raw' for non-image files like PDFs
      format: 'pdf',
    },
    (error, result) => {
      if (error) {
        console.error('Cloudinary Upload Error:', error);
        return res.status(500).send({ message: 'Cloudinary upload failed', error });
      }

      // --- DEBUGGING LOG #3: Check Cloudinary result ---
      console.log('--- Cloudinary Upload Result ---');
      console.log(result);
      console.log('--------------------------------');

      res.status(200).send({
        message: 'File uploaded successfully',
        url: result.secure_url,
      });
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
});

export default router;