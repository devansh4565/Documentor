// backend/index.js

// ✅ Add this block at the very top to catch any silent crashes
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
const cookieParser = require('cookie-parser');
const { OpenAI } = require("openai");

// --- CONFIG & DB CONNECTION ---
dotenv.config();
const connectDB = require("./config/db");
connectDB(); // Connect to the database

// --- MODELS & ROUTES ---
const User = require('./models/User');
const { router: authRoutes } = require('./routes/auth');
const chatRoutes = require("./routes/chatRoutes");
const uploadRoutes = require("./routes/upload");
const filesRoutes = require('./routes/files');
const mindMapRoutes = require('./routes/mindmap');
const highlightRoutes = require("./routes/highlights");

// --- INITIALIZATIONS ---
const app = express();
const PORT = process.env.PORT || 5001; // Provide a default port
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// --- MIDDLEWARE SETUP ---
// Required for secure cookies to work behind a proxy like Render
app.set('trust proxy', 1);

// ✅ Consolidated CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://documentor-frontend.onrender.com',
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}));

// Passport configuration
require('./config/passport')(passport); // Assuming passport config is in its own file
app.use(passport.initialize());
app.use(passport.session());


// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/files', filesRoutes);
app.use("/api/mindmap", mindMapRoutes);
app.use("/api/highlights", highlightRoutes);

// AI-related routes
app.post("/api/generate-mindmap", require('./routes/generateMindmap')); // Moved logic to its own file for cleanliness
app.post("/api/ask", require('./routes/ask')); // Moved logic to its own file


// --- ROOT & STATIC ROUTES ---
app.get("/", (req, res) => {
  res.send("DocuMentor backend is up and running! 🚀");
});


// --- ERROR HANDLING MIDDLEWARE (must be last) ---
// 404 Not Found handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.method} ${req.originalUrl}` });
});

// Global 500 Error handler
app.use((err, req, res, next) => {
  console.error("💥 GLOBAL ERROR HANDLER:", err.stack);
  res.status(500).json({ message: "Something went wrong on the server." });
});


// --- SERVER LISTENER ---
app.listen(PORT, () => console.log(`✅ Server is listening on PORT ${PORT}`));