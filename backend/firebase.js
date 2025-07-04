const admin = require('firebase-admin');

// This code is now "environment-aware". It will work on both
// your local machine and on Render without any changes.

try {
  // Check if the special environment variable from Render exists
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // If we're on Render, parse the credentials from the environment variable
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    
    console.log("Initializing Firebase Admin with JSON from environment variable...");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully on production server.");

  } else {
    // If we're on a local machine, it might be using a local file.
    // This is a common setup for local development.
    // Make sure you have a `serviceAccountKey.json` file locally.
    const serviceAccount = require('./serviceAccountKey.json'); // Adjust path if needed
    
    console.log("Initializing Firebase Admin with local service account file...");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully for local development.");
  }
} catch (error) {
  console.error("CRITICAL: Firebase Admin SDK initialization failed!", error);
}


// Export the initialized admin object
module.exports = admin;