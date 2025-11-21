// backend/db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbFile = path.join(__dirname, "..", "data", "attendance.db");

// ensure directory exists
const dataDir = path.dirname(dbFile);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// initialize schema + seed
async function init() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      role TEXT,
      full_name TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      name TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS student_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      course_id INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      course_id INTEGER,
      student_qr TEXT,
      timestamp TEXT,
      status TEXT
    )
  `);

  // seed if empty
  const row = await get(`SELECT COUNT(*) AS c FROM users`);
  if (row.c === 0) {
    const bcrypt = require("bcryptjs");

    // sample users
    const users = [
      { username: "prof1", password: "profpass", role: "professor", full_name: "Dr. Prof One" },
      { username: "stu1", password: "student1", role: "student", full_name: "John Student" },
      { username: "stu2", password: "student2", role: "student", full_name: "Jillian Student" }
    ];

    for (const u of users) {
      let hash = bcrypt.hashSync(u.password, 10);
      await run(
        `INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)`,
        [u.username, hash, u.role, u.full_name]
      );
    }

    // courses
    await run(`INSERT INTO courses (code, name) VALUES ('CS301', 'Data Structures')`);
    await run(`INSERT INTO courses (code, name) VALUES ('CS405', 'Web Development')`);

    // link students
    const s1 = (await get(`SELECT id FROM users WHERE username='stu1'`)).id;
    const s2 = (await get(`SELECT id FROM users WHERE username='stu2'`)).id;
    const cs301 = (await get(`SELECT id FROM courses WHERE code='CS301'`)).id;
    const cs405 = (await get(`SELECT id FROM courses WHERE code='CS405'`)).id;

    await run(`INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)`, [s1, cs301]);
    await run(`INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)`, [s1, cs405]);
    await run(`INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)`, [s2, cs301]);
    await run(`INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)`, [s2, cs405]);

    // seed an attendance log
    await run(
      `INSERT INTO attendance_logs (student_id, course_id, student_qr, timestamp, status)
       VALUES (?, ?, ?, ?, ?)`,
      [s1, cs301, "STU1-QRCODE", new Date().toISOString(), "PRESENT"]
    );
  }
}

// run init
init();

module.exports = { db, run, get, all };
