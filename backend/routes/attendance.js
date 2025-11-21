// backend/routes/attendance.js (sqlite3 version)
const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { authMiddleware } = require('../auth');

// POST /api/attendance — log attendance
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { qr, course } = req.body;
    if (!qr) return res.status(400).json({ error: 'missing_qr' });

    // try matching student via username or id
    let student = await get(`SELECT id FROM users WHERE username = ?`, [qr]);
    let student_id = student ? student.id : null;

    // also try numeric user id
    if (!student_id && /^\d+$/.test(qr)) {
      let s = await get(`SELECT id FROM users WHERE id = ?`, [Number(qr)]);
      if (s) student_id = s.id;
    }

    // match course code like "CS301 — Data Structures"
    let course_id = null;
    if (course) {
      const code = course.split(" ")[0]; // "CS301"
      const c = await get(`SELECT id FROM courses WHERE code = ?`, [code]);
      if (c) course_id = c.id;
    }

    const timestamp = new Date().toISOString();

    const info = await run(
      `INSERT INTO attendance_logs (student_id, course_id, student_qr, timestamp, status)
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, course_id, qr, timestamp, 'PRESENT']
    );

    return res.json({
      success: true,
      record: {
        id: info.lastID,
        student_id,
        course_id,
        student_qr: qr,
        timestamp,
        status: 'PRESENT'
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET all logs (prof) or own logs (student)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let rows;

    if (user.role === 'professor' || user.role === 'admin') {
      rows = await all(`
        SELECT al.id, al.student_id, u.username AS student_username,
               al.student_qr, c.code AS course_code, c.name AS course_name,
               al.timestamp, al.status
        FROM attendance_logs al
        LEFT JOIN users u ON al.student_id = u.id
        LEFT JOIN courses c ON al.course_id = c.id
        ORDER BY al.timestamp DESC
      `);
    } else {
      rows = await all(`
        SELECT al.id, al.student_id, u.username AS student_username,
               al.student_qr, c.code AS course_code, c.name AS course_name,
               al.timestamp, al.status
        FROM attendance_logs al
        LEFT JOIN users u ON al.student_id = u.id
        LEFT JOIN courses c ON al.course_id = c.id
        WHERE al.student_id = ?
        ORDER BY al.timestamp DESC
      `, [user.id]);
    }

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/attendance/me — student-only
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'student') return res.status(403).json({ error: 'not_student' });

    const rows = await all(`
      SELECT al.id, c.code AS course_code, c.name AS course_name,
             al.timestamp, al.status
      FROM attendance_logs al
      LEFT JOIN courses c ON al.course_id = c.id
      WHERE al.student_id = ?
      ORDER BY al.timestamp DESC
    `, [user.id]);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
