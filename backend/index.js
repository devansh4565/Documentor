const express = require("express");
const cors = require("cors");
app.use(cors({
  origin: 'https://documentor-frontend.onrender.com',
  credentials: true
}));
const dotenv = require("dotenv");
const path = require("path");
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const { router: authRoutes, ensureAuth } = require('./routes/auth');

// --- Local Imports ---
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const ocrRoutes = require("./routes/ocr");
const fileRoutes = require("./routes/files");
const highlightRoutes = require("./routes/highlights"); // Assuming you might have this

// --- Configuration ---
dotenv.config();
connectDB();
const app = express();
const PORT = process.env.PORT;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Middleware ---

// 1. Explicitly enable CORS for all preflight requests
app.options('*', cors({ origin: 'https://documentor-frontend.onrender.com', credentials: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: true, // since HTTPS
    sameSite: 'None', // cross-site cookies
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    // domain: '.onrender.com'  // Removed domain temporarily for testing
  },
  rolling: true, // Refresh session expiration on each request
}));



// 2. Set up your main CORS middleware for all other requests


// The rest of your middleware
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(passport.initialize());
app.use(passport.session());
// Debug middleware to log session and user info
app.use((req, res, next) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session object:", req.session);
  console.log("User object:", req.user);
  next();
});

// Serve static files (like the PDFs) from the 'public/uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use('/api/auth', authRoutes);
console.log("✅ Auth routes registered to /api/auth");

// --- API Routes ---
app.use("/api/chats", chatRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/highlights", highlightRoutes);

function estimateTokenCount(text) {
  if (!text) return 0;
  return text.split(/\s+/).length; // Splits by whitespace
}

// At the top
const mindMapRoutes = require('./routes/mindmap');
// In the API Routes section
app.use("/api/mindmap", mindMapRoutes);

app.post("/api/generate-mindmap", async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }
    // This is the "magic" prompt that asks the AI for structured data.
    const prompt = `
      You are an expert at structural analysis. Your task is to analyze the provided document text and convert its main ideas into a hierarchical mind map structure.
      Your response MUST be ONLY a single, valid JSON object. Do not include any text, explanations, or markdown formatting like \`\`\`json.
      The JSON object must have a root node with a 'text' property for the document's main topic, and a 'children' array for its main points. Each element in the 'children' array is another node object with its own 'text' and an optional 'children' property.
      Here is the document text:
      """
      ${documentText}
      """
    `;
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // This model is excellent for structured data
      messages: [{ role: "user", content: prompt }],
      // This special parameter FORCES the model to output valid JSON.
      response_format: { type: "json_object" },
    });
    const rawResponse = completion.choices[0].message.content;
    // We parse the JSON string from the AI into a real JavaScript object.
    const mindMapData = JSON.parse(rawResponse);
    console.log("✅ AI successfully generated mind map data.");
    // We send the parsed object back to the frontend.
    res.status(200).json(mindMapData);
  } catch (error) {
    console.error("❌ Mind map generation on server failed:", error);
    res.status(500).json({ error: "Failed to generate mind map from AI." });
  }
});

if (!process.env.SESSION_SECRET) {
  console.error("FATAL ERROR: SESSION_SECRET is not defined in .env file.");
  process.exit(1); // Exit the process with an error code
}

// --- Add this new Passport configuration block ---
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://documentor-backend-btiq.onrender.com/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log("🔐 Google profile received:", profile);
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        console.log("👤 Existing user found:", user.displayName);
        return done(null, user);
      } else {
        // Safety check
        const email = profile.emails?.[0]?.value || "no-email@example.com";
        const photo = profile.photos?.[0]?.value || "";
        const newUser = new User({
          googleId: profile.id,
          displayName: profile.displayName,
          email: email,
          profilePicture: photo
        });
        await newUser.save();
        console.log("✅ New user created:", newUser.displayName);
        return done(null, newUser);
      }
    } catch (err) {
      console.error("🔥 Error in GoogleStrategy callback:", err);
      return done(err, false);
    }
  }
));

// --- In server/index.js, inside the Passport configuration ---
passport.serializeUser((user, done) => {
  console.log("serializeUser called with user:", user);
  done(null, user.id);
});

// ✅ THIS IS THE NEW, CORRECT ASYNC/AWAIT SYNTAX
passport.deserializeUser(async (id, done) => {
  try {
    console.log("deserializeUser called with id:", id);
    const user = await User.findById(id);
    console.log("deserializeUser found user:", user ? user.displayName : null);
    done(null, user);
  } catch (err) {
    console.error("deserializeUser error:", err);
    done(err, null);
  }
});

// =========================================================================
// ✅ NEW AND IMPROVED "/api/ask" ENDPOINT WITH CONVERSATIONAL MEMORY
// This is the core logic for chatting with documents.
// =========================================================================
app.post("/api/ask", async (req, res) => {
  try {
    const { history, fileContent } = req.body;
    console.log("<<<<< BACKEND: Received this history from frontend:", JSON.stringify(history, null, 2));
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "Message history is required." });
    }
    // --- INTELLIGENT ROUTING LOGIC ---
    const OPENAI_TOKEN_LIMIT = 100000; // Set a safe limit, a bit less than the actual 128k
    const tokenCount = estimateTokenCount(fileContent);
    let aiResponse = ""; // A variable to hold the response from either model
    // ✅ ROUTE 1: If the document is large, use Google Gemini
    if (tokenCount > OPENAI_TOKEN_LIMIT) {
      console.log(`🔷 Document is large (${tokenCount} tokens). Routing to Google Gemini.`);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const userQuery = history[history.length - 1].content; // Get the latest user question
      const prompt = `
          You are a helpful AI assistant called DocuMentor. You will answer questions based on the provided document context. 
          Do not mention that you are an AI. Be concise and helpful. 
          USER'S QUESTION: "${userQuery}"
          DOCUMENT CONTEXT:
          --- DOCUMENT START ---
          ${fileContent}
          --- DOCUMENT END ---
      `;
      const result = await model.generateContent(prompt);
      const response = result.response;
      aiResponse = response.text();
    // ✅ ROUTE 2: If the document is small/medium, use OpenAI
    } else {
      console.log(`🔷 Document is small (${tokenCount} tokens). Routing to OpenAI GPT.`);
      const messagesForAPI = [
        {
          role: "system",
          content: `You are a helpful AI assistant called DocuMentor. You will answer questions based on the provided document context. Do not mention that you are an AI. Be concise and helpful. Here is the document content: \n\n--- DOCUMENT START ---\n${fileContent}\n--- DOCUMENT END ---`
        },
        ...history
      ];
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // gpt-4o is a great, cost-effective choice here
        messages: messagesForAPI,
      });
      aiResponse = completion.choices[0].message.content;
    }
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("❌ Error in AI Router /api/ask:", error.message);
    res.status(500).json({ error: "Failed to get response from the AI." });
  }
});

// =========================================================================
// --- Other Helper & Root Routes ---
// =========================================================================
// Your GPT summary route (if you still need it) can remain here.
app.post("/api/gpt-summary", async (req, res) => {
  // Your existing logic for summarization
});

// A simple root route to check if the server is running.
app.get("/", (req, res) => {
  res.send("DocuMentor backend is up and running! 🚀");
});

// A catch-all route for any requests that don't match the ones above.
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", message: `The route ${req.method} ${req.url} does not exist.` });
});

// --- Server Listener ---
app.listen(PORT, () => console.log(`✅ Server is listening on PORT ${PORT}`));


// in backend/index.js

// ... after all your `app.use("/api/...")` routes ...

// =========================================================================
// ✅ The "Catch-All" Handler for Single-Page Application (SPA) routing
// =========================================================================
// This sends all non-API GET requests to the frontend's main HTML file,
// allowing React Router to handle the URL.

app.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login-failed`, 
    session: true 
  }),
  (req, res) => {
    console.log("🎉 Auth success, user:", req.user);

    // ✅ This HTML lets the cookie be set before redirecting
    res.send(`
      <html>
        <head>
          <title>Redirecting...</title>
          <script>
            // Small delay to ensure cookie from backend is saved
            setTimeout(() => {
              window.location.href = "${process.env.FRONTEND_URL}/workarea";
            }, 500);
          </script>
        </head>
        <body>
          <p>Login successful. Redirecting...</p>
        </body>
      </html>
  `);
  }
);

// This should be the VERY LAST route handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", message: `The route ${req.method} ${req.url} does not exist.` });
});
app.use((err, req, res, next) => {
  console.error("💥 Global server error:", err);
  res.status(500).json({ error: "Something went wrong." });
});
