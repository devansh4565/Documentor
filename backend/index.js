const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { OpenAI } = require("openai");

// --- Configuration ---
dotenv.config();
const connectDB = require("./config/db");
connectDB();

const PORT = process.env.PORT || 5000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();

// --- Middleware ---
app.use(cors({
  origin: process.env.FRONTEND_URL, // e.g., 'https://documentor-frontend.onrender.com'
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// This line tells Express how to serve your uploaded files.
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// --- API Routes ---
// We no longer need the old /api/auth routes.
const chatRoutes = require("./routes/chatRoutes");
const ocrRoutes = require("./routes/ocr");
const filesRoutes = require('./routes/files');
const mindMapRoutes = require('./routes/mindmap');

app.use("/api/chats", chatRoutes);
app.use("/api/ocr", ocrRoutes);
app.use('/api/files', filesRoutes);
app.use("/api/mindmap", mindMapRoutes);


// --- AI Endpoints (These do not need user authentication directly, as they are called by authenticated routes) ---

function estimateTokenCount(text) {
  if (!text) return 0;
  return text.split(/\s+/).length;
}

app.post("/api/ask", async (req, res) => {
  try {
    const { history, fileContent } = req.body;
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "Message history is required." });
    }
    
    const messagesForAPI = [
      {
        role: "system",
        content: `You are a helpful AI assistant called DocuMentor. You will answer questions based on the provided document context. Do not mention that you are an AI. Be concise and helpful. Here is the document content: \n\n--- DOCUMENT START ---\n${fileContent || 'No document provided.'}\n--- DOCUMENT END ---`
      },
      ...history
    ];
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messagesForAPI,
    });
    
    const aiResponse = completion.choices[0].message.content;
    res.json({ response: aiResponse });

  } catch (error) {
    console.error("❌ Error in /api/ask:", error.message);
    res.status(500).json({ error: "Failed to get response from the AI." });
  }
});

app.post("/api/generate-mindmap", async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }
    const prompt = `Analyze the provided document text and convert its main ideas into a hierarchical mind map structure. Your response MUST be ONLY a single, valid JSON object. The object must have a root node with a 'text' property and a 'children' array. Each child is a node with its own 'text' and optional 'children' array. Here is the document text: """${documentText}"""`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    
    const mindMapData = JSON.parse(completion.choices[0].message.content);
    res.status(200).json(mindMapData);

  } catch (error) {
    console.error("❌ Mind map generation failed:", error);
    res.status(500).json({ error: "Failed to generate mind map." });
  }
});


// --- Server Listener ---
app.listen(PORT, () => console.log(`✅ Server is listening on PORT ${PORT}`));