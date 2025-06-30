const mongoose = require("mongoose");
const dotenv = require("dotenv");
const ChatSession = require("./models/ChatSession");
const ChatMessage = require("./models/ChatMessage");

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("🧹 Connected to DB, starting cleanup...");

  // Delete all sessions named "chat1" or empty sessions
  const deletedSessions = await ChatSession.deleteMany({
    $or: [{ name: "chat1" }, { name: "" }, { name: { $exists: false } }],
  });

  // Optionally delete all messages (start clean)
  const deletedMessages = await ChatMessage.deleteMany({});

  console.log(`✅ Deleted ${deletedSessions.deletedCount} sessions`);
  console.log(`✅ Deleted ${deletedMessages.deletedCount} messages`);

  mongoose.disconnect();
});
