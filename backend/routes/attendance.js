// backend/routes/attendance.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  try {
    const { qr } = req.body;
    if (!qr) return res.status(400).json({ error: 'Missing qr payload' });

    const timestamp = new Date().toISOString();
    const record = {
      id: `ATT-${Date.now()}`,
      student_id: qr,
      status: 'PRESENT',
      timestamp
    };

    await db.addAttendance(record);
    return res.json({ success: true, record });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await db.getAttendance();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
