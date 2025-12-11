const path = require('path');
const express = require('express');
const routes = require('./routes');
const log = require('../log');
const { requireDashboardAuth } = require('./middleware/authMiddleware');

const app = express();

// Public assets for the web portal
const publicDir = path.join(__dirname, '..', 'web');

// Protected dashboard route (/dashboard)
app.get('/dashboard', requireDashboardAuth, (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});

// Login route (/login) serves the main portal entry
app.get('/login', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Static assets (images, css, etc.)
app.use(express.static(publicDir));

// API routes
app.use(express.json());
app.use('/api', routes);

// Root route redirects to /login for convenience
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Fallback error handler
app.use((err, req, res, next) => {
  log.error(`Unhandled error: ${err.stack || err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
