const express = require('express');
const router = express.Router();
const { run, get, all, getNowPH } = require('../db');
const { authMiddleware } = require('../auth');

// POST /api/attendance — Log attendance
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { qr, course, status, remarks } = req.body;
    if (!qr) return res.status(400).json({ error: 'missing_qr' });
    if (!course) return res.status(400).json({ error: 'missing_course' });

    const courseRow = await get(`SELECT id, secure_qr_mode FROM courses WHERE code = ?`, [course]);
    if (!courseRow) return res.status(404).json({ error: 'Course not found' });

    let studentUsername = qr;
    let isSecureToken = false;
    let parsedToken = null;

    try {
      if (qr.trim().startsWith('{')) {
        parsedToken = JSON.parse(qr);
        if (parsedToken.u && parsedToken.exp) isSecureToken = true;
      }
    } catch (e) {}

    if (courseRow.secure_qr_mode) {
      if (!isSecureToken) return res.status(400).json({ error: 'Secure QR required' });
      if (parsedToken.exp < Date.now()) return res.status(400).json({ error: 'QR Code Expired' });
      studentUsername = parsedToken.u;
    } else {
      if (isSecureToken) studentUsername = parsedToken.u;
    }

    let student = await get(`SELECT id, full_name FROM users WHERE username = ?`, [studentUsername]);
    if (!student && /^\d+$/.test(studentUsername)) {
      student = await get(`SELECT id, full_name FROM users WHERE id = ?`, [Number(studentUsername)]);
    }
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const student_id = student.id;
    const course_id = courseRow.id;
    const nowPH = getNowPH();
    const today = nowPH.split('T')[0];
    
    const existing = await get(
      `SELECT id FROM attendance_logs WHERE student_id = ? AND course_id = ? AND timestamp LIKE ?`,
      [student_id, course_id, `${today}%`]
    );

    if (existing) return res.status(400).json({ error: 'Already logged today' });

    const finalStatus = status || 'PRESENT';
    const finalRemarks = remarks || '';

    const info = await run(
      `INSERT INTO attendance_logs (student_id, course_id, student_qr, timestamp, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student_id, course_id, studentUsername, nowPH, finalStatus, finalRemarks]
    );

    return res.json({
      success: true,
      record: { id: info.lastID, student_qr: studentUsername, timestamp: nowPH, status: finalStatus, student_name: student.full_name }
    });

  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'professor') return res.status(403).json({ error: 'forbidden' });
  try {
    const { status, remarks } = req.body;
    await run('UPDATE attendance_logs SET status=?, remarks=? WHERE id=?', [status, remarks || '', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'db_error' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'professor') return res.status(403).json({ error: 'forbidden' });
  try { await run('DELETE FROM attendance_logs WHERE id=?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'db_error' }); }
});

router.delete('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'admins_only' });
  try {
    await run('DELETE FROM attendance_logs'); 
    try { await run('DELETE FROM sqlite_sequence WHERE name="attendance_logs"'); } catch(e) {}
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'db_error' }); }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const totalClasses = (await get(`SELECT COUNT(*) as c FROM courses`)).c;
    const students = (await get(`SELECT COUNT(*) as c FROM users WHERE role='student'`)).c;
    const totalLogs = (await get(`SELECT COUNT(*) as c FROM attendance_logs`)).c;
    const presentLogs = (await get(`SELECT COUNT(*) as c FROM attendance_logs WHERE status='PRESENT'`)).c;
    const rate = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 0;
    
    // FIX: substr(timestamp, 1, 10) correctly extracts 'YYYY-MM-DD' in standard SQL
    const chartData = await all(`
      SELECT substr(timestamp, 1, 10) as date, COUNT(*) as count 
      FROM attendance_logs GROUP BY date ORDER BY date DESC LIMIT 7
    `);

    res.json({ classes: totalClasses, students: students, rate: rate + "%", chart: chartData.reverse() });
  } catch(err) { res.status(500).json({error: 'db_error'}); }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let sql = `SELECT al.id, al.student_id, u.username AS student_username, u.full_name AS student_name, al.student_qr, c.code AS course_code, c.name AS course_name, al.timestamp, al.status, al.remarks FROM attendance_logs al LEFT JOIN users u ON al.student_id = u.id LEFT JOIN courses c ON al.course_id = c.id`;
    if (user.role === 'student') sql += ` WHERE al.student_id = ${user.id}`;
    sql += ` ORDER BY al.timestamp DESC`;
    const rows = await all(sql);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'student') return res.status(403).json({ error: 'not_student' });
    const rows = await all(`SELECT al.id, c.code AS course_code, c.name AS course_name, al.timestamp, al.status, al.remarks FROM attendance_logs al LEFT JOIN courses c ON al.course_id = c.id WHERE al.student_id = ? ORDER BY al.timestamp DESC`, [user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

module.exports = router;