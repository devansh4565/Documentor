const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

// Import your authentication middleware
// Assuming it's named verifyFirebaseToken.js in a 'middleware' folder
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken'); 

// --- Apply the authentication middleware to ALL routes below this line ---
// Any request to /api/chats/* will now require a valid token.
router.use(verifyFirebaseToken);


// --- All routes are now protected ---

// Base routes for sessions
// GET /api/chats - Get all sessions for the logged-in user
router.get("/", chatController.getAllSessions); 
// POST /api/chats - Create a new session for the logged-in user
router.post("/", chatController.createSession);

// Routes for a specific session
// GET /api/chats/:sessionId - Get a single session
router.get("/:sessionId", chatController.getSingleSession);
// PUT /api/chats/:sessionId - Rename a session
router.put("/:sessionId", chatController.renameSession);
// DELETE /api/chats/:sessionId - Delete a session
router.delete("/:sessionId", chatController.deleteSession);

// Nested routes for messages within a session
// POST /api/chats/:sessionId/messages - Add a message to a session
router.post("/:sessionId/messages", chatController.addMessage);
// GET /api/chats/:sessionId/messages - Get all messages for a session
router.get("/:sessionId/messages", chatController.getMessages);

module.exports = router;