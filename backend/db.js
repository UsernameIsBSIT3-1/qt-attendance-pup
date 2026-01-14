const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbFile = path.join(__dirname, "..", "data", "attendance.db");
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

// Timezone Helper (UTC+8)
function getNowPH() {
  const d = new Date();
  const offset = 8 * 60; 
  const local = new Date(d.getTime() + (offset * 60 * 1000));
  return local.toISOString().replace('Z', ''); 
}

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, role TEXT, full_name TEXT, year TEXT, section TEXT, avatar TEXT, preferences TEXT)`);
  // FIX: Added UNIQUE constraint to 'code' to prevent duplicate courses
  await run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT, schedule TEXT, assigned_faculty TEXT, is_online INTEGER DEFAULT 0, secure_qr_mode INTEGER DEFAULT 0)`);
  
  await run(`CREATE TABLE IF NOT EXISTS student_courses (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, course_id INTEGER)`);
  await run(`CREATE TABLE IF NOT EXISTS attendance_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, course_id INTEGER, student_qr TEXT, timestamp TEXT, status TEXT, remarks TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS excuses (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, course_code TEXT, date TEXT, reason TEXT, status TEXT, timestamp TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT, action TEXT, details TEXT, timestamp TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, type TEXT, created_by TEXT, timestamp TEXT)`);

  const row = await get(`SELECT COUNT(*) AS c FROM users`);
  if (row.c === 0) {
    console.log("Seeding database...");
    const bcrypt = require("bcryptjs");
    const users = [
      { username: "admin", password: "adminpassword", role: "admin", full_name: "System Admin" },
      { username: "faculty", password: "profpass", role: "professor", full_name: "Prof. Jefferson Costales" },
      { username: "2023-00164-PQ-0", password: "student1", role: "student", full_name: "Julian Student", year: "3", section: "BSIT 3-1" },
      { username: "2023-00212-PQ-0", password: "student2", role: "student", full_name: "Jillian Student", year: "3", section: "BSCpE 3-1" }
    ];
    for (const u of users) {
      let hash = bcrypt.hashSync(u.password, 10);
      await run(`INSERT INTO users (username, password_hash, role, full_name, year, section, avatar, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [u.username, hash, u.role, u.full_name, u.year || null, u.section || null, 'default', '{"dateFormat":"MM/DD/YYYY","timeFormat":"12h"}']);
    }
    const subjects = [
      { code: "COMP 015", name: "Fundamentals of Research", sched: "F 10:30AM-01:30PM" },
      { code: "COMP 016", name: "Web Development", sched: "T/T 09:00AM-02:00PM" }
    ];
    for (const s of subjects) { 
      // Using INSERT OR IGNORE to respect the new UNIQUE constraint during seeding
      await run(`INSERT OR IGNORE INTO courses (code, name, schedule, assigned_faculty) VALUES (?, ?, ?, ?)`, [s.code, s.name, s.sched, "COSTALES, JEFFERSON"]); 
    }
    try {
      const s1 = (await get(`SELECT id FROM users WHERE username='2023-00164-PQ-0'`)).id;
      const s2 = (await get(`SELECT id FROM users WHERE username='2023-00212-PQ-0'`)).id;
      const c1 = (await get(`SELECT id FROM courses WHERE code='COMP 016'`)).id;
      await run(`INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)`, [s1, c1]);
      await run(`INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)`, [s2, c1]);
    } catch(e) {}
    console.log("Seeding complete.");
  }
}

init();
module.exports = { db, run, get, all, getNowPH };