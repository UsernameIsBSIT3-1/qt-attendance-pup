const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../db');
const { authMiddleware } = require('../auth');

// Create User
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'professor') return res.status(403).json({ error: 'forbidden' });
    const { username, password, role, full_name, year, section } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'missing_fields' });
    const hash = bcrypt.hashSync(password, 10);
    const info = await run(`INSERT INTO users (username, password_hash, role, full_name, year, section, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)`, [username, hash, role, full_name || null, year || null, section || null, 'default']);
    res.json({ success: true, id: info.lastID });
  } catch (err) { res.status(500).json({ error: 'db_error' }); }
});

// Update Self (Profile)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { full_name, password, avatar } = req.body;
    const userId = req.user.id;
    if (full_name) await run(`UPDATE users SET full_name = ? WHERE id = ?`, [full_name, userId]);
    if (avatar) await run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatar, userId]);
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, userId]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

// Admin Update User
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const { full_name, username, role, password, year, section } = req.body;
    const userId = req.params.id;
    if (full_name) await run('UPDATE users SET full_name=? WHERE id=?', [full_name, userId]);
    if (username) await run('UPDATE users SET username=? WHERE id=?', [username, userId]);
    if (role) await run('UPDATE users SET role=? WHERE id=?', [role, userId]);
    if (year !== undefined) await run('UPDATE users SET year=? WHERE id=?', [year, userId]);
    if (section !== undefined) await run('UPDATE users SET section=? WHERE id=?', [section, userId]);
    if (password && password.trim() !== "") {
      const hash = bcrypt.hashSync(password, 10);
      await run('UPDATE users SET password_hash=? WHERE id=?', [hash, userId]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'db_error' }); }
});

// GET My Courses
router.get('/courses', authMiddleware, async (req, res) => { 
  try { 
    const r = await all(`
      SELECT c.id, c.code, c.name, c.schedule, c.assigned_faculty, c.is_online, c.secure_qr_mode 
      FROM student_courses sc 
      JOIN courses c ON sc.course_id = c.id 
      WHERE sc.student_id = ?`, 
      [req.user.id]
    ); 
    res.json(r); 
  } catch(e) { 
    res.status(500).json({error:'db_error'}); 
  } 
});

// List Users
router.get('/', authMiddleware, async (req, res) => { try { const users = await all(`SELECT id, username, role, full_name, year, section FROM users ORDER BY id DESC`); res.json(users); } catch (err) { res.status(500).json({ error: 'server_error' }); } });

// Delete User (CASCADE)
router.delete('/:id', authMiddleware, async (req, res) => { 
  try { 
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' }); 
    const id = req.params.id;
    // Cascade delete related records
    await run('DELETE FROM attendance_logs WHERE student_id = ?', [id]);
    await run('DELETE FROM student_courses WHERE student_id = ?', [id]);
    await run('DELETE FROM excuses WHERE student_id = ?', [id]);
    await run('DELETE FROM audit_logs WHERE user_id = ?', [id]);
    await run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: 'db_error' }); } 
});

module.exports = router;