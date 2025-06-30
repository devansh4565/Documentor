// in backend/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

const { ensureAuth } = require("./auth"); // or from middleware if you separated it
router.get("/", ensureAuth, chatController.getAllSessions);
router.post("/", chatController.createSession);

// ✅ VERIFY THESE ROUTES WITH PARAMETERS
router.get("/:sessionId", chatController.getSingleSession);
router.put("/:sessionId", chatController.renameSession);
router.delete("/:sessionId", chatController.deleteSession);

// ✅ VERIFY THESE NESTED ROUTES WITH PARAMETERS
router.post("/:sessionId/messages", chatController.addMessage);
router.get("/:sessionId/messages", chatController.getMessages);

module.exports = router;