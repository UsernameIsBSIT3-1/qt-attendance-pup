// backend/auth.js
const jwt = require('jsonwebtoken');
const SECRET = 'supersecret_jwt_key_change_this'; // change later if needed
const { get } = require('./db');

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no_token' });
  const match = auth.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'invalid_header' });
  const token = match[1];
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'invalid_token' });

  // attach user info from DB (Updated to fetch 'year')
  try {
    const user = await get('SELECT id, username, role, full_name, year, section FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'no_user' });
    req.user = user;
    next();
  } catch (err) {
    console.error('authMiddleware DB error', err);
    res.status(500).json({ error: 'server_error' });
  }
}

module.exports = { generateToken, verifyToken, authMiddleware };