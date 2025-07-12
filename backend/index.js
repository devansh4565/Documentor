// =================================================================
// --- IMPORTS & INITIALIZATION ---
// =================================================================
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Configuration ---
dotenv.config();
const connectDB = require("./config/db");
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize AI SDKs
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);


// =================================================================
// --- GLOBAL MIDDLEWARE (Order is very important) ---
// =================================================================

// 1. CORS: Handles cross-origin requests from your frontend. This must come first.
// =================================================================
// --- GLOBAL MIDDLEWARE (Order is very important) ---
// =================================================================

// 1. Define your CORS options once.
const corsOptions = {
  origin: process.env.FRONTEND_URL, // e.g., 'https://documentor-frontend.onrender.com'
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all standard methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly allow these headers
};

// 2. Handle preflight requests for all routes.
// The browser sends an OPTIONS request first for complex requests.
// This tells the browser that your server will accept the actual request.
app.options('*', cors(corsOptions));

// 3. Apply the main CORS middleware for all subsequent requests.
// This ensures that GET, POST, etc., requests also get the correct headers.
app.use(cors(corsOptions));

// 4. Body Parsers: To handle JSON and URL-encoded request bodies.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. Static File Serving: To serve your uploaded PDFs.
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ... your API routes and other code remain the same ...


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

function estimateTokenCount(text) {
  if (!text) return 0;
  // A simple approximation: 1 token is roughly 4 characters.
  return Math.ceil((text.length / 4) * 1.1); // Add 10% buffer
}

app.post("/api/ask", async (req, res) => {
  try {
    const { history, fileContent } = req.body;
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "Message history is required." });
    }

    const OPENAI_TOKEN_LIMIT = 100000;
    const tokenCount = estimateTokenCount(fileContent);
    let aiResponse = "";

    // ROUTE 1: If the document is large, use Google Gemini
    if (tokenCount > OPENAI_TOKEN_LIMIT) {
      console.log(`🔷 Document is large (${tokenCount} tokens). Routing to Google Gemini.`);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const userQuery = history[history.length - 1].content;
      const prompt = `You are a helpful AI assistant. Answer the user's question based on the provided document context.\n\nUSER'S QUESTION: "${userQuery}"\n\nDOCUMENT CONTEXT:\n---\n${fileContent}\n---`;
      const result = await model.generateContent(prompt);
      aiResponse = result.response.text();
    } 
    // ROUTE 2: If the document is small/medium, use OpenAI
    else {
      console.log(`🔷 Document is small (${tokenCount} tokens). Routing to OpenAI GPT.`);
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
      aiResponse = completion.choices[0].message.content;
    }
    
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
    
    res.status(200).json(JSON.parse(completion.choices[0].message.content));

  } catch (error) {
    console.error("❌ Mind map generation failed:", error);
    res.status(500).json({ error: "Failed to generate mind map." });
  }
});


// =================================================================
// --- ROOT & ERROR HANDLERS ---
// =================================================================

// A simple root route to check if the server is running.
app.get("/", (req, res) => {
  res.send("Documentor backend is up and running! 🚀");
});

// Catch-all for any routes that don't match the ones above.
// This should be near the end.
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found", message: `The route ${req.method} ${req.originalUrl} does not exist on this server.` });
});

// Global error handler. This should be the VERY LAST `app.use()`.
app.use((err, req, res, next) => {
  console.error("💥 Global Unhandled Error:", err.stack);
  res.status(500).json({ error: "Something went wrong on the server." });
});


// =================================================================
// --- SERVER LISTENER ---
// =================================================================
app.listen(PORT, () => console.log(`✅ Server is listening on PORT ${PORT}`));
module.exports = app;