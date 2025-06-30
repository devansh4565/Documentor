// === START OF FILE: backend/controllers/chatController.js ===

const ChatSession = require("../models/ChatSession");
const ChatMessage = require("../models/ChatMessage");
const mongoose = require('mongoose');

// Create a new chat session
exports.createSession = async (req, res) => {
    const session = new ChatSession({
        name: req.body.name || 'Untitled Session',
        user: req.user.id, // ✅ Associate the new session with the user
        messages: [],
    });
  try {
    const session = await ChatSession.create({
      name: req.body.name || "Untitled Session",
      user: req.user.id // ✅ required so new sessions are tied to you
    });
    res.status(201).json(session);
  } catch (err) {
    console.error("❌ Could not create chat session", err);
    res.status(500).json({ error: "Failed to create session" });
  }
};

// Get all chat sessions
exports.getAllSessions = async (req, res) => {
  try {
    console.log("🧠 getAllSessions called");
    console.log("👤 User:", req.user);

    const sessions = await ChatSession.find({ user: req.user.id });
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
    if (!session) {
      return res.status(404).json({ error: "Chat session not found" });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat session" });
  }
};

// ✅ THIS IS THE FINAL, CORRECTED addMessage FUNCTION
// It now uses `role` and `content` to match your ChatMessage model schema.
// --- The FINAL addMessage function in chatController.js ---

exports.addMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content } = req.body; // Frontend sends `role` and `content`
    
    if (!role || !content) {
      return res.status(400).json({ error: "Role and content are required." });
    }

    // ✅ This object now perfectly matches your ChatMessage schema
    const message = await ChatMessage.create({
      sessionId: sessionId,
      role: role,       // Save 'role'
      content: content, // Save 'content'
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
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 }); // sorting by 'timestamp'
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

exports.renameSession = async (req, res) => {
  try {
    const session = await ChatSession.findByIdAndUpdate(
      req.params.sessionId,
      { name: req.body.name },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Rename failed" });
  }
};

exports.deleteSession = async (req, res) => {
    const session = await ChatSession.findOne({ _id: req.params.sessionId, user: req.user.id });
    if (!session) return res.status(404).json({ message: "Chat not found or you don't have permission." });
  try {
    await ChatSession.findByIdAndDelete(req.params.sessionId);
    await ChatMessage.deleteMany({ sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to delete session:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};