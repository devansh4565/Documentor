// backend/middleware/verifyFirebaseToken.js

const admin = require('../firebase'); // Make sure this path is correct for your firebase.js init file

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach user payload to the request
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

module.exports = verifyFirebaseToken;