const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Ensure https URLs are generated
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const userId = req.user.uid;
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    return {
      folder: 'documentor_uploads',
      // The public_id is the unique filename in Cloudinary
      public_id: `${userId}-${Date.now()}-${safeOriginalName}`,
      // ✅ This ensures the asset is treated as a standard, public upload
      resource_type: "auto" 
    };
  },
});

module.exports = { storage }; // Only export storage