// backend/index.js

// Add this block at the very top to catch any silent crashes
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

// --- CONFIG & DB CONNECTION ---
dotenv.config();
const connectDB = require("./config/db");
connectDB();

// --- MODELS & ROUTES ---
const User = require('./models/User');
const { router: authRoutes } = require('./routes/auth');
const chatRoutes = require("./routes/chatRoutes");
const uploadRoutes = require("./routes/upload");
const filesRoutes = require('./routes/files');
const mindMapRoutes = require('./routes/mindmap');
const highlightRoutes = require("./routes/highlights");
const generateMindmapRoute = require('./routes/generateMindmap'); // Assuming logic is moved
const askRoute = require('./routes/ask'); // Assuming logic is moved


// --- INITIALIZATIONS ---
const app = express();
const PORT = process.env.PORT || 5001;


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
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 14 * 24 * 60 * 60 * 1000
  }
}));

// --- PASSPORT CONFIGURATION (Restored) ---
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
      } else {
        const newUser = new User({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
          profilePicture: profile.photos[0].value
        });
        await newUser.save();
        return done(null, newUser);
      }
    } catch (err) {
      console.error(err);
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
app.use("/api/generate-mindmap", generateMindmapRoute);
app.use("/api/ask", askRoute);


// --- ROOT ROUTE ---
app.get("/", (req, res) => {
  res.send("DocuMentor backend is up and running! 🚀");
});


// --- ERROR HANDLING MIDDLEWARE ---
app.use((req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error("💥 GLOBAL ERROR HANDLER:", err.stack);
  res.status(500).json({ message: "Something went wrong on the server." });
});


// --- SERVER LISTENER ---
app.listen(PORT, () => console.log(`✅ Server is listening on PORT ${PORT}`));