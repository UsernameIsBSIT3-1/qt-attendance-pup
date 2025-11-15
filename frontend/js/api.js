// frontend/js/api.js
const API_BASE = window.location.origin; // works when server serves static files too

async function postAttendance(qr) {
  const res = await fetch(`${API_BASE}/api/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr })
  });
  return res.json();
}

async function fetchAttendance() {
  const res = await fetch(`${API_BASE}/api/attendance`);
  return res.json();
}
