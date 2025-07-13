const cloudinary = require('cloudinary').v2;

// This configures the cloudinary object for the whole application.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("✅ Cloudinary configured.");

// We no longer export anything. This file's only job is to configure.