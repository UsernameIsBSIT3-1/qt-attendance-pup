const API_BASE = window.location.origin;

// --- THEME & PREFERENCES ---
function initTheme() {
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.theme = 'light';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.theme = 'dark';
  }
}

// Global Date Formatter based on User Settings
function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  let format = 'MM/DD/YYYY';
  
  if (user.preferences) {
    try {
      const p = JSON.parse(user.preferences);
      if (p.dateFormat) format = p.dateFormat;
    } catch (e) {}
  }

  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();

  if (format === 'DD/MM/YYYY') return `${d}/${m}/${y}`;
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  return `${m}/${d}/${y}`; // Default
}

function formatTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  toast.innerHTML = type === 'error' ? `<i class="fa-solid fa-circle-exclamation mr-2"></i> ${msg}` : `<i class="fa-solid fa-check-circle mr-2"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function toggleSidebar() {
  const aside = document.querySelector('aside');
  const overlay = document.querySelector('.overlay');
  if (aside) aside.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

function initSidebar() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isStudent = user.role === 'student';
  const isAdmin = user.role === 'admin';

  const navAdmin = document.getElementById('nav-admin');
  const navScan = document.getElementById('nav-scan');
  const navReports = document.getElementById('nav-reports');
  const navDash = document.getElementById('nav-dash');

  if (navAdmin) {
    if (isAdmin) navAdmin.classList.remove('hidden');
    else navAdmin.classList.add('hidden');
  }
  if (navScan) {
    if (isStudent) navScan.classList.add('hidden');
    else navScan.classList.remove('hidden');
  }
  if (navReports) {
    if (isStudent) navReports.classList.add('hidden');
    else navReports.classList.remove('hidden');
  }
  if (navDash && isStudent) {
    navDash.href = 'student-dashboard.html';
  }

  // Highlight Active
  const currentPage = window.location.pathname.split("/").pop() || 'index.html';
  document.querySelectorAll('aside nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.remove('nav-item');
      link.classList.add('nav-active');
    } else {
      link.classList.remove('nav-active');
      link.classList.add('nav-item');
    }
  });
}

initTheme();

// --- AUTH ---
function token() { return localStorage.getItem('token'); }
function authHeaders() { const t = token(); return t ? { 'Authorization': 'Bearer ' + t } : {}; }

async function verifyToken() {
  try {
    const res = await fetch(`${API_BASE}/api/me`, { headers: authHeaders() });
    if (res.status >= 400) logout();
  } catch (e) { console.error(e); }
}

function checkAuth() {
  if (!token()) { window.location.href = 'login.html'; return; }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const page = window.location.pathname.split("/").pop();

  if (user.role === 'student' && ['scan.html', 'reports.html', 'admin.html', 'index.html', 'class-details.html'].includes(page)) {
    window.location.href = 'student-dashboard.html';
    return;
  }
  if (user.role === 'professor' && page === 'admin.html') {
    window.location.href = 'index.html';
    return;
  }
  initSidebar();
  verifyToken();
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

// --- API FUNCTIONS ---
async function apiCall(url, method = 'GET', body = null) {
  const options = { method, headers: authHeaders() };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(`${API_BASE}${url}`, options);
    if (res.status === 401) { logout(); return; }
    return res.json();
  } catch (e) {
    return { error: 'network_error' };
  }
}

// User & Auth
async function login(username, password) { return apiCall('/api/auth/login', 'POST', { username, password }); }
async function me() { return apiCall('/api/me'); }
async function getUsers() { return apiCall('/api/users'); }
async function createUser(data) { return apiCall('/api/users', 'POST', data); }
async function adminUpdateUser(id, data) { return apiCall(`/api/users/${id}`, 'PUT', data); }
async function deleteUser(id) { return apiCall(`/api/users/${id}`, 'DELETE'); }
async function updateProfile(data) { return apiCall('/api/users/me', 'PUT', data); }
async function updatePreferences(prefs) {
  const user = JSON.parse(localStorage.getItem('user'));
  const current = user.preferences ? JSON.parse(user.preferences) : {};
  const newPrefs = { ...current, ...prefs };
  
  // Persist locally
  user.preferences = JSON.stringify(newPrefs);
  localStorage.setItem('user', JSON.stringify(user));
  
  // Send to backend
  await updateProfile({ preferences: JSON.stringify(newPrefs) });
  return { success: true };
}

// Courses
async function fetchMyCourses() { return apiCall('/api/users/courses'); }
async function fetchCourses() { return apiCall('/api/courses'); }
async function createCourse(data) { return apiCall('/api/courses', 'POST', data); }
async function updateCourse(id, data) { return apiCall(`/api/courses/${id}`, 'PUT', data); }
async function deleteCourse(id) { return apiCall(`/api/courses/${id}`, 'DELETE'); }
async function toggleCourseMode(id, type, val) { 
  const body = {}; 
  body[type] = val; 
  return apiCall(`/api/courses/${id}/mode`, 'PUT', body); 
}

// Enrollments
async function getEnrollments() { return apiCall('/api/enrollments'); }
async function createEnrollment(s, c) { return apiCall('/api/enrollments', 'POST', { student_username: s, course_code: c }); }
async function deleteEnrollment(id) { return apiCall(`/api/enrollments/${id}`, 'DELETE'); }

// Attendance
async function postAttendance(qr, course) { return apiCall('/api/attendance', 'POST', { qr, course }); }
async function fetchAttendance() { return apiCall('/api/attendance'); }
async function fetchStats() { return apiCall('/api/attendance/stats'); }
async function fetchAttendanceMe() { return apiCall('/api/attendance/me'); }
async function updateAttendanceLog(id, s, r) { return apiCall(`/api/attendance/${id}`, 'PUT', { status: s, remarks: r }); }
async function deleteAttendanceLog(id) { return apiCall(`/api/attendance/${id}`, 'DELETE'); }
async function clearAllLogs() { return apiCall('/api/attendance', 'DELETE'); }
async function onlineCheckIn(courseId) { return apiCall(`/api/courses/${courseId}/checkin`, 'POST'); }
async function getPrediction(courseId) { return apiCall(`/api/attendance/prediction/${courseId}`); }

// Secure QR & Excuses
async function getSecureQR() { return apiCall('/api/users/secure-qr'); }
async function fetchExcuses() { return apiCall('/api/excuses'); }
async function createExcuse(data) { return apiCall('/api/excuses', 'POST', data); }
async function updateExcuse(id, status) { return apiCall(`/api/excuses/${id}`, 'PUT', { status }); }

// Misc
async function fetchAuditLogs() { return apiCall('/api/audit'); }
async function fetchAnnouncements() { return apiCall('/api/announcements'); }
async function createAnnouncement(data) { return apiCall('/api/announcements', 'POST', data); }
async function deleteAnnouncement(id) { return apiCall(`/api/announcements/${id}`, 'DELETE'); }