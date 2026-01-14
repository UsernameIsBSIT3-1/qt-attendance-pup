// frontend/js/scanner.js

let scanner = null;
let isScanning = false;
let scannedCodes = new Set();
let lastScanTime = 0;
const SCAN_COOLDOWN = 3000; // 3 seconds between scans
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// DOM Elements
const els = {
  courseSelect: document.getElementById('courseSelect'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  statusMsg: document.getElementById('scan-status'),
  scannedCount: document.getElementById('scannedCount'),
  recentList: document.getElementById('recentList'),
  sessionCourse: document.getElementById('sessionCourse')
};

// Play a short beep
function playBeep() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(audioCtx.destination);
  o.type = 'sine';
  o.frequency.value = 880; // A5
  g.gain.value = 0.1;
  o.start();
  setTimeout(() => o.stop(), 100);
}

// Initialize Courses
async function initScannerPage() {
  try {
    const courses = await fetchCourses();
    if (courses && courses.length > 0) {
      els.courseSelect.innerHTML = '<option value="" disabled selected>Select a Course</option>' + 
        courses.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
      els.startBtn.disabled = false;
    } else {
      els.courseSelect.innerHTML = '<option disabled>No courses available</option>';
      els.startBtn.disabled = true;
    }
  } catch (e) {
    showToast("Failed to load courses", "error");
  }
}

// Handle a detected QR Code
async function onScanSuccess(decodedText, decodedResult) {
  const now = Date.now();
  if (now - lastScanTime < SCAN_COOLDOWN) return;
  lastScanTime = now;

  // We send the RAW text (decodedText) to the backend.
  // The backend determines if it's a username or a Secure JSON token.
  
  // Extract ID for local duplicate check (optimistic)
  let displayId = decodedText;
  try {
    if (decodedText.startsWith('{')) {
      const data = JSON.parse(decodedText);
      if (data.u) displayId = data.u;
    }
  } catch(e) {}

  if (scannedCodes.has(displayId)) {
    showToast(`Already scanned: ${displayId}`, "error");
    return;
  }

  playBeep();
  
  // UI Update (Optimistic)
  scannedCodes.add(displayId);
  els.scannedCount.innerText = scannedCodes.size;
  
  const li = document.createElement("li");
  li.className = "flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 animate-fade";
  li.innerHTML = `
    <span class="font-medium text-slate-700 dark:text-slate-200">
      <i class="fa-solid fa-spinner fa-spin mr-2 text-blue-500" id="icon-${now}"></i> ${displayId}
    </span>
    <span class="text-xs text-slate-400">${new Date().toLocaleTimeString()}</span>
  `;
  els.recentList.prepend(li);

  // Send to Backend
  const courseCode = els.courseSelect.value;
  const res = await postAttendance(decodedText, courseCode);

  const icon = document.getElementById(`icon-${now}`);
  
  if (res.error) {
    // Revert optimistic add if needed, or just show error
    scannedCodes.delete(displayId); // Allow retry
    li.classList.add("border-red-500");
    if(icon) { icon.className = "fa-solid fa-circle-xmark text-red-500 mr-2"; }
    
    const errDiv = document.createElement('div');
    errDiv.className = "text-xs text-red-500 w-full mt-1";
    errDiv.innerText = res.error;
    li.appendChild(errDiv);
    
    showToast(res.error, "error");
  } else {
    // Success
    const realName = res.record.student_name || displayId;
    if(icon) { icon.className = "fa-solid fa-check-circle text-green-500 mr-2"; }
    li.querySelector('span.font-medium').innerHTML = `<i class="fa-solid fa-check-circle text-green-500 mr-2"></i> ${realName}`;
    showToast(`Marked Present: ${realName}`);
  }
}

async function startScanning() {
  if (isScanning) return;
  const course = els.courseSelect.value;
  if (!course) {
    showToast("Please select a course first", "error");
    return;
  }

  // Ensure AudioContext is ready (User Interaction Requirement)
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  els.sessionCourse.innerText = course;
  
  // Swap Buttons & Enable Stop
  els.startBtn.classList.add('hidden');
  els.stopBtn.classList.remove('hidden');
  els.stopBtn.disabled = false; // <--- FIX: Enable the button
  
  els.courseSelect.disabled = true;
  els.statusMsg.innerText = "Camera active. Point at QR code.";
  
  els.recentList.innerHTML = "";
  els.scannedCount.innerText = "0";
  scannedCodes.clear();

  // Create new instance if needed (or reuse if you refactor to singleton)
  // Html5Qrcode handles cleanup if .stop() was called correctly previously
  scanner = new Html5Qrcode("reader");
  
  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      (errorMessage) => { /* ignore frame parse errors */ }
    );
    isScanning = true;
  } catch (err) {
    console.error(err);
    showToast("Camera access denied or failed", "error");
    stopScanning();
  }
}

async function stopScanning() {
  if (scanner && isScanning) {
    try {
      await scanner.stop();
      scanner.clear();
    } catch(e) { console.error("Stop error", e); }
    isScanning = false;
  }
  
  // Swap Buttons & Disable Stop
  els.startBtn.classList.remove('hidden');
  els.stopBtn.classList.add('hidden');
  els.stopBtn.disabled = true; // <--- FIX: Disable again for safety
  
  els.courseSelect.disabled = false;
  els.statusMsg.innerText = "Ready to start.";
}

// Manual Entry Logic
async function submitManual() {
  const code = document.getElementById('manualInput').value;
  const course = els.courseSelect.value;
  
  if (!code) return;
  if (!course) return showToast("Select a course first", 'error');
  
  // Reuse the success handler
  await onScanSuccess(code, null);
  
  document.getElementById('manualModal').classList.add('hidden');
  document.getElementById('manualInput').value = "";
}

// Event Listeners
if(els.startBtn) els.startBtn.addEventListener('click', startScanning);
if(els.stopBtn) els.stopBtn.addEventListener('click', stopScanning);