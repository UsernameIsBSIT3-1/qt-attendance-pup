// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken } = require('../auth');
const { get } = require('../db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'missing_fields' });

  // Updated query: grade -> year
  const user = await get(
    `SELECT id, username, password_hash, role, full_name, year, section
     FROM users WHERE username = ?`,
    [username]
  );

  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      year: user.year, // changed from grade
      section: user.section
    }
  });
});

module.exports = router;