const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { run, get, all, getNowPH } = require('./db');
const { authMiddleware } = require('./auth');

// Routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const usersRoutes = require('./routes/users');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

// Audit Helper
async function logAudit(userId, username, action, details) {
  try {
    await run(`INSERT INTO audit_logs (user_id, username, action, details, timestamp) VALUES (?,?,?,?,?)`, 
      [userId, username, action, details, getNowPH()]);
  } catch (e) {
    console.error("Audit Error", e);
  }
}

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', usersRoutes);

// User Info
app.get('/api/me', authMiddleware, (req, res) => res.json(req.user));

// --- SPECIFIC COURSE/LOGIC ROUTES ---

// Toggle Online/Secure Mode (Professor)
app.put('/api/courses/:id/mode', authMiddleware, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'forbidden' });
  const { is_online, secure_qr_mode } = req.body;
  const courseId = req.params.id;

  try {
    if (is_online !== undefined) {
      await run(`UPDATE courses SET is_online = ? WHERE id = ?`, [is_online ? 1 : 0, courseId]);
    }
    if (secure_qr_mode !== undefined) {
      await run(`UPDATE courses SET secure_qr_mode = ? WHERE id = ?`, [secure_qr_mode ? 1 : 0, courseId]);
    }
    await logAudit(req.user.id, req.user.username, 'UPDATE_MODE', `Course ${courseId} updated`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'db_error' });
  }
});

// Online Check-in (Student)
app.post('/api/courses/:id/checkin', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'forbidden' });
  const courseId = req.params.id;

  try {
    const course = await get(`SELECT * FROM courses WHERE id = ?`, [courseId]);
    if (!course || !course.is_online) return res.status(400).json({ error: 'Online mode not active' });

    const enrolled = await get(`SELECT id FROM student_courses WHERE student_id=? AND course_id=?`, [req.user.id, courseId]);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled' });

    const nowPH = getNowPH();
    const today = nowPH.split('T')[0];
    const exists = await get(`SELECT id FROM attendance_logs WHERE student_id=? AND course_id=? AND timestamp LIKE ?`, [req.user.id, courseId, `${today}%`]);
    if (exists) return res.status(400).json({ error: 'Already checked in' });

    await run(`INSERT INTO attendance_logs (student_id, course_id, student_qr, timestamp, status, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, courseId, req.user.username, nowPH, 'PRESENT', 'Online Check-in']);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'db_error' });
  }
});

// Get Secure QR Token (Student)
app.get('/api/users/secure-qr', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'forbidden' });
  
  // FIX: Validity increased to 60s to prevent expiration during network latency
  // The frontend refreshes every 30s, creating a safe 30s overlap window.
  const token = crypto.randomBytes(8).toString('hex');
  const payload = JSON.stringify({ u: req.user.username, t: token, exp: Date.now() + 60000 });
  
  res.json({ qr_data: payload });
});

// AI Prediction
app.get('/api/attendance/prediction/:courseId', authMiddleware, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'forbidden' });
  try {
    const logs = await all(`SELECT timestamp, status FROM attendance_logs WHERE course_id = ? ORDER BY timestamp ASC`, [req.params.courseId]);
    
    if (logs.length < 3) return res.json({ prediction: "Insufficient Data", projected_rate: "--%" });

    const sessions = {};
    logs.forEach(l => {
      const d = l.timestamp.split('T')[0];
      if (!sessions[d]) sessions[d] = { present: 0, total: 0 };
      if (l.status === 'PRESENT' || l.status === 'LATE') sessions[d].present++;
      sessions[d].total++;
    });

    const rates = Object.values(sessions).map(s => s.present / (s.total || 1));
    const n = rates.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += rates[i];
      sumXY += i * rates[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avg = sumY / n;
    
    let text = "Stable Trend";
    if (slope > 0.05) text = "Improving Attendance 📈";
    else if (slope < -0.05) text = "Declining Attendance 📉";

    res.json({ prediction: text, projected_rate: Math.round(avg * 100) + "%" });
  } catch (e) {
    res.status(500).json({ error: 'db_error' });
  }
});

/* --- EXISTING COURSES CRUD --- */
app.get('/api/courses', authMiddleware, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM courses ORDER BY code ASC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'db_error' }); }
});

app.post('/api/courses', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { code, name, schedule, assigned_faculty } = req.body;
  try {
    await run('INSERT INTO courses (code, name, schedule, assigned_faculty) VALUES (?,?,?,?)', [code, name, schedule, assigned_faculty]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'db_error_unique' }); }
});

app.put('/api/courses/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { code, name, schedule, assigned_faculty } = req.body;
  await run('UPDATE courses SET code=?, name=?, schedule=?, assigned_faculty=? WHERE id=?', [code, name, schedule, assigned_faculty, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/courses/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  await run('DELETE FROM courses WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Enrollments
app.get('/api/enrollments', authMiddleware, async (req, res) => {
  const rows = await all(`SELECT sc.id, u.username, c.code FROM student_courses sc JOIN users u ON sc.student_id=u.id JOIN courses c ON sc.course_id=c.id ORDER BY sc.id DESC`);
  res.json(rows);
});

app.post('/api/enrollments', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const { student_username, course_code } = req.body;
  const s = await get('SELECT id FROM users WHERE username = ?', [student_username]);
  const c = await get('SELECT id FROM courses WHERE code = ?', [course_code]);
  if (!s || !c) return res.status(400).json({ error: 'Not found' });
  await run('INSERT INTO student_courses (student_id, course_id) VALUES (?,?)', [s.id, c.id]);
  res.json({ success: true });
});

app.delete('/api/enrollments/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  await run('DELETE FROM student_courses WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Announcements
app.get('/api/announcements', authMiddleware, async (req, res) => {
  const rows = await all(`SELECT * FROM announcements ORDER BY timestamp DESC LIMIT 10`);
  res.json(rows);
});

app.post('/api/announcements', authMiddleware, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'forbidden' });
  const { title, content, type } = req.body;
  await run(`INSERT INTO announcements (title, content, type, created_by, timestamp) VALUES (?,?,?,?,?)`, [title, content, type, req.user.full_name, getNowPH()]);
  res.json({ success: true });
});

app.delete('/api/announcements/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  await run(`DELETE FROM announcements WHERE id=?`, [req.params.id]);
  res.json({ success: true });
});

// Audit
app.get('/api/audit', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const rows = await all(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100`);
  res.json(rows);
});

// Excuses
app.get('/api/excuses', authMiddleware, async (req, res) => {
  let sql = `SELECT e.*, u.full_name FROM excuses e JOIN users u ON e.student_id = u.id`;
  if (req.user.role === 'student') sql += ` WHERE e.student_id = ${req.user.id}`;
  sql += ` ORDER BY e.timestamp DESC`;
  const rows = await all(sql);
  res.json(rows);
});

app.post('/api/excuses', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'forbidden' });
  const { course_code, date, reason } = req.body;
  await run(`INSERT INTO excuses (student_id, course_code, date, reason, status, timestamp) VALUES (?,?,?,?,'PENDING',?)`, [req.user.id, course_code, date, reason, getNowPH()]);
  res.json({ success: true });
});

app.put('/api/excuses/:id', authMiddleware, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'forbidden' });
  const { status } = req.body;
  await run(`UPDATE excuses SET status=? WHERE id=?`, [status, req.params.id]);
  
  if (status === 'APPROVED') {
    const ex = await get(`SELECT * FROM excuses WHERE id=?`, [req.params.id]);
    const co = await get(`SELECT id FROM courses WHERE code=?`, [ex.course_code]);
    if (co) {
      await run(`UPDATE attendance_logs SET status='EXCUSED', remarks=? WHERE student_id=? AND course_id=? AND timestamp LIKE ?`, 
        ['Excused: ' + ex.reason, ex.student_id, co.id, `${ex.date}%`]);
    }
  }
  res.json({ success: true });
});

app.get('/api/backup', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const dbPath = path.join(__dirname, '..', 'data', 'attendance.db');
  res.download(dbPath, `backup_attendance.db`);
});

app.use('/', express.static(path.join(__dirname, '..', 'frontend')));
const PORT = 3000;
app.listen(PORT, () => console.log(`\n>> Server running at: http://localhost:${PORT}\n`));