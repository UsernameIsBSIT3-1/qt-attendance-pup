// backend/routes/users.js (sqlite3 version)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../db');
const { authMiddleware } = require('../auth');

// create user (admin/prof)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'professor')
      return res.status(403).json({ error: 'forbidden' });

    const { username, password, role, full_name } = req.body;
    if (!username || !password || !role)
      return res.status(400).json({ error: 'missing_fields' });

    const hash = bcrypt.hashSync(password, 10);

    const info = await run(
      `INSERT INTO users (username, password_hash, role, full_name)
       VALUES (?, ?, ?, ?)`,
      [username, hash, role, full_name || null]
    );

    res.json({ success: true, id: info.lastID });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// list users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await all(`SELECT id, username, role, full_name FROM users`);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
