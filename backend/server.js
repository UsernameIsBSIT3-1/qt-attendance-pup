// backend/server.js (sqlite3 version)
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const usersRoutes = require('./routes/users');
const { run, get, all } = require('./db'); // <-- IMPORTANT CHANGE
const { authMiddleware } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Auth test route
app.get('/api/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// Data routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', usersRoutes);

// Courses endpoint
app.get('/api/courses', async (req, res) => {
  try {
    const rows = await all(`SELECT id, code, name FROM courses`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'db_error' });
  }
});

// Serve frontend
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`\nServer running at: http://localhost:${PORT}\n`)
);
