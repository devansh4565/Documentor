// =================================================================
// --- IMPORTS & INITIALIZATION ---
// =================================================================
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { OpenAI } = require("openai");

// --- Configuration ---
dotenv.config();
const connectDB = require("./config/db");
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// =================================================================
// --- GLOBAL MIDDLEWARE (Order is very important) ---
// =================================================================

// 1. CORS: Handles cross-origin requests from your frontend. This must come first.
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// 2. Body Parsers: To handle JSON and URL-encoded request bodies.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Static File Serving: To serve your uploaded PDFs.
// This correctly maps the URL path `/uploads` to the physical directory `public/uploads`.
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// =================================================================
// --- API ROUTES ---
// =================================================================
// All these routes use the modern, token-based `verifyFirebaseToken` middleware internally.
const chatRoutes = require("./routes/chatRoutes");
const uploadRoutes = require("./routes/upload");
const filesRoutes = require('./routes/files');
const mindMapRoutes = require('./routes/mindmap');
const highlightRoutes = require("./routes/highlights");

app.use("/api/chats", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/files', filesRoutes);
app.use("/api/mindmap", mindMapRoutes);
app.use("/api/highlights", highlightRoutes);


// =================================================================
// --- AI-SPECIFIC ENDPOINTS ---
// =================================================================

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
    
    res.status(200).json(JSON.parse(completion.choices[0].message.content));

  } catch (error) {
    console.error("❌ Mind map generation failed:", error);
    res.status(500).json({ error: "Failed to generate mind map." });
  }
});


app.post("/api/ask", async (req, res) => {
  try {
    const { history, fileContent } = req.body;
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "Message history is required." });
    }
    
    const messagesForAPI = [
      {
        role: "system",
        content: `You are a helpful AI assistant. Answer questions based on the document context provided.\n\nDOCUMENT CONTEXT:\n---\n${fileContent || 'No document provided.'}\n---`
      },
      ...history
    ];
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messagesForAPI,
    });
    
    res.json({ response: completion.choices[0].message.content });

  } catch (error) {
    console.error("❌ Error in /api/ask:", error.message);
    res.status(500).json({ error: "Failed to get response from the AI." });
  }
});


// =================================================================
// --- ROOT & ERROR HANDLERS ---
// =================================================================

app.get("/", (req, res) => {
  res.send("Documentor backend is up and running! 🚀");
});

// Catch-all 404 handler for any unhandled routes
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", message: `The route ${req.method} ${req.originalUrl} does not exist.` });
});


// =================================================================
// --- SERVER LISTENER ---
// =================================================================
app.listen(PORT, () => console.log(`✅ Server is listening on PORT ${PORT}`));