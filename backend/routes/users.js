// backend/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Missing id or name' });
  const user = { id, name };
  await db.addUser(user);
  res.json({ success: true, user });
});

router.get('/', async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
});

module.exports = router;
