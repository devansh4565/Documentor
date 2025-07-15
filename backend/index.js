// backend/index.js

// Global error catcher for silent crashes. Must be at the very top.
process.on('unhandledRejection', (reason, promise) => {
  console.error('‼️ UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

// --- IMPORTS ---
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- CONFIG & DB CONNECTION ---
dotenv.config();
const connectDB = require("./config/db");
connectDB();

// --- MODELS & ROUTE IMPORTS ---
const User = require('./models/User');
const authRoutes = require('./routes/auth').router;
const chatRoutes = require("./routes/chatRoutes");
const uploadRoutes = require("./routes/upload");
const filesRoutes = require('./routes/files');
const mindMapRoutes = require('./routes/mindmap');
const highlightRoutes = require("./routes/highlights");

// --- INITIALIZATIONS ---
const app = express();
const PORT = process.env.PORT || 5001;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);


// --- MIDDLEWARE SETUP ---
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://documentor-frontend.onrender.com',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: 'sessions' }),
  cookie: { secure: true, httpOnly: true, sameSite: 'None', maxAge: 14 * 24 * 60 * 60 * 1000 }
}));

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      }
      const newUser = new User({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        profilePicture: profile.photos[0].value
      });
      await newUser.save();
      return done(null, newUser);
    } catch (err) {
      console.error("🔥 Error in GoogleStrategy callback:", err);
      return done(err, false);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/files', filesRoutes);
app.use("/api/mindmap", mindMapRoutes);
app.use("/api/highlights", highlightRoutes);

// AI-related routes with full logic restored
app.post("/api/generate-mindmap", async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }
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
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const mindMapData = JSON.parse(completion.choices[0].message.content);
    console.log("✅ AI successfully generated mind map data.");
    res.status(200).json(mindMapData);
  } catch (error) {
    console.error("❌ Mind map generation on server failed:", error);
    res.status(500).json({ error: "Failed to generate mind map from AI." });
  }
});

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
    const OPENAI_TOKEN_LIMIT = 100000;
    const tokenCount = estimateTokenCount(fileContent);
    let aiResponse = "";

    if (tokenCount > OPENAI_TOKEN_LIMIT) {
      console.log(`🔷 Document is large (${tokenCount} tokens). Routing to Google Gemini.`);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const userQuery = history[history.length - 1].content;
      const prompt = `You are a helpful AI assistant... [Your full Gemini prompt here] ...${userQuery} ... ${fileContent}`;
      const result = await model.generateContent(prompt);
      aiResponse = result.response.text();
    } else {
      console.log(`🔷 Document is small (${tokenCount} tokens). Routing to OpenAI GPT.`);
      const messagesForAPI = [
        {
          role: "system",
          content: `You are a helpful AI assistant... [Your full OpenAI prompt here] ...${fileContent}`
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
    console.error("❌ Error in AI Router /api/ask:", error.message);
    res.status(500).json({ error: "Failed to get response from the AI." });
  }
});


// --- ROOT & ERROR HANDLING ---
app.get("/", (req, res) => {
  res.send("DocuMentor backend is up and running! 🚀");
});

app.use((req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error("💥 GLOBAL ERROR HANDLER:", err.stack);
  res.status(500).json({ message: "Something went wrong on the server." });
});


// --- SERVER LISTENER ---
app.listen(PORT, () => console.log(`✅ Server is listening on PORT ${PORT}`));