// frontend/js/api.js
const API_BASE = window.location.origin;

function token() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const t = token();
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}

async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

async function me() {
  const res = await fetch(`${API_BASE}/api/me`, { headers: authHeaders() });
  return res.json();
}

async function postAttendance(qr, course) {
  const res = await fetch(`${API_BASE}/api/attendance`, {
    method: 'POST',
    headers: Object.assign({'Content-Type': 'application/json'}, authHeaders()),
    body: JSON.stringify({ qr, course })
  });
  return res.json();
}

async function fetchAttendance() {
  const res = await fetch(`${API_BASE}/api/attendance`, { headers: authHeaders() });
  return res.json();
}

async function fetchAttendanceMe() {
  const res = await fetch(`${API_BASE}/api/attendance/me`, { headers: authHeaders() });
  return res.json();
}

async function fetchCourses() {
  const res = await fetch(`${API_BASE}/api/courses`);
  return res.json();
}
