// frontend/js/scanner.js

function onScanSuccess(decodedText, onLogged) {
  console.log("Scanned: ", decodedText);
  // try to post to backend
  fetch('/api/attendance', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ qr: decodedText })
  })
  .then(r => r.json())
  .then(data => {
    console.log("Server response:", data);
    if (onLogged) onLogged(data);
  })
  .catch(err => console.error(err));
}
