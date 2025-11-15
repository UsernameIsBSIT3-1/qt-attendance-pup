// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const attendanceRoutes = require('./routes/attendance');
const usersRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', usersRoutes);

// serve frontend static files (optional convenience)
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
