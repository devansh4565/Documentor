const express = require('express');
const passport = require('passport');
const authRouter = express.Router();
// Route to initiate Google Sign-In
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// The callback route Google will redirect to after successful sign-in
authRouter.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login-failed' }),
    (req, res) => {
        // Successful authentication, redirect to the app's main work area.
        res.redirect('http://localhost:5173/workarea');
    }
);
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
};

// Route for the frontend to check if a user is currently logged in
authRouter.get('/me', ensureAuth, (req, res) => {
    res.status(200).json(req.user);
});
// Route for logging out
// in backend/routes/auth.js

// ✅ THIS IS THE NEW, CORRECT WAY TO HANDLE LOGOUT with passport >= v0.6.0
authRouter.post('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    // After logging out, destroy the session and clear the cookie
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Successfully logged out" });
    });
  });
});
module.exports = {
  router: authRouter,
  ensureAuth
};