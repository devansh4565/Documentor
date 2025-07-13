const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with your credentials from the .env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer to use Cloudinary for storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'documentor_uploads', // A folder name in your Cloudinary account
    format: 'pdf', // We only allow PDFs
    // This function creates a unique public ID (filename) for each file
    public_id: (req, file) => {
        const userId = req.user.uid; // Get user ID from our auth middleware
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        return `${userId}-${Date.now()}-${safeOriginalName}`;
    },
  },
});

module.exports = { cloudinary, storage };