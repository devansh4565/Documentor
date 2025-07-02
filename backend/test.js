require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const app = express();

app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // localhost
    sameSite: 'Lax',
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy((u, p, done) => {
  done(null, { id: '123', username: 'test' });
}));

passport.serializeUser((u, done) => done(null, u.id));
passport.deserializeUser((id, done) => {
  console.log('deserializeUser', id);
  done(null, { id, username: 'test' });
});

app.get('/login', (req, res) => {
  const mockUser = { id: 'user123', username: 'devan' };

  req.login(mockUser, (err) => {
    if (err) {
      console.error("❌ Login failed", err);
      return res.status(500).send("Login failed");
    }

    console.log("✅ Manual login successful!");
    res.send("You are now logged in.");
  });
});


app.get('/protected', (req, res) => {
  console.log('req.user on /protected:', req.user);
  res.json({ user: req.user });
});

app.listen(3001, () => console.log('💡 Test server running on http://localhost:3001'));
app.get('/force-login', (req, res) => {
  const mockUser = { id: 'user123', username: 'devan' };
  req.login(mockUser, (err) => {
    if (err) return res.status(500).send("Login failed");
    console.log("✅ Manual login successful!");
    res.send("You are now logged in.");
  });
});