const ChatSession = require("../models/ChatSession");
const ChatMessage = require("../models/ChatMessage");
const mongoose = require('mongoose');

// Create a new chat session
exports.createSession = async (req, res) => {
  try {
    const session = await ChatSession.create({
      name: req.body.name || "Untitled Session",
      // ✅ FIX: Use req.user.uid to get the Firebase User ID
      user: req.user.uid 
    });
    res.status(201).json(session);
  } catch (err) {
    console.error("❌ Could not create chat session", err);
    res.status(500).json({ error: "Failed to create session" });
  }
};

// Get all chat sessions for the logged-in user
exports.getAllSessions = async (req, res) => {
  try {
    console.log("🧠 getAllSessions called");
    console.log("👤 User from Firebase token:", req.user);

    // ✅ FIX: Find sessions where the 'user' field matches the Firebase UID
    const sessions = await ChatSession.find({ user: req.user.uid });
    
    console.log("📁 Sessions returned:", sessions);
    res.status(200).json(sessions);
  } catch (err) {
    console.error("❌ Error in getAllSessions:", err);
    res.status(500).json({ error: "Could not fetch sessions" });
  }
};

// Get a single session's details
exports.getSingleSession = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    // Security check: Make sure the requested session belongs to the logged-in user
    if (!session || session.user.toString() !== req.user.uid) {
      return res.status(404).json({ error: "Chat session not found or access denied" });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat session" });
  }
};

// Add a message to a session
exports.addMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content } = req.body;
    
    if (!role || !content) {
      return res.status(400).json({ error: "Role and content are required." });
    }

    const message = await ChatMessage.create({
      sessionId: sessionId,
      role: role,
      content: content,
    });
    
    await ChatSession.findByIdAndUpdate(sessionId, { updatedAt: new Date() });
    
    res.status(201).json(message);
  } catch (err) {
    console.error("❌ Failed to add message in controller:", err);
    res.status(500).json({ error: "Failed to add message to the database." });
  }
};

// Get all messages for a specific session
exports.getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Rename a session
exports.renameSession = async (req, res) => {
  try {
    // ✅ FIX: Find the session by its ID AND the user's UID to ensure they own it
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.sessionId, user: req.user.uid },
      { name: req.body.name },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ error: "Session not found or you don't have permission." });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Rename failed" });
  }
};

// Delete a session
exports.deleteSession = async (req, res) => {
  try {
    // ✅ FIX: Ensure the user owns the session before deleting
    const session = await ChatSession.findOneAndDelete({ _id: req.params.sessionId, user: req.user.uid });
    
    if (!session) {
      return res.status(404).json({ message: "Chat not found or you don't have permission." });
    }

    // If the session was found and deleted, also delete its associated messages
    await ChatMessage.deleteMany({ sessionId: req.params.sessionId });
    
    res.json({ success: true, message: "Session and messages deleted successfully." });
  } catch (err) {
    console.error("❌ Failed to delete session:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};