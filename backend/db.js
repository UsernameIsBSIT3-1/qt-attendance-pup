// backend/db.js
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const fs = require('fs');

const file = path.join(__dirname, '..', 'data', 'db.json');

// ensure folder exists
const dataDir = path.dirname(file);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// create file if missing
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({ attendance: [], users: [] }, null, 2));
}

const adapter = new JSONFile(file);
const db = new Low(adapter);

async function read() {
  await db.read();
  db.data = db.data || { attendance: [], users: [] };
}

async function addAttendance(record) {
  await read();
  db.data.attendance.push(record);
  await db.write();
  return record;
}

async function getAttendance() {
  await read();
  return db.data.attendance;
}

async function addUser(user) {
  await read();
  db.data.users.push(user);
  await db.write();
  return user;
}

async function getUsers() {
  await read();
  return db.data.users;
}

module.exports = { addAttendance, getAttendance, addUser, getUsers };
