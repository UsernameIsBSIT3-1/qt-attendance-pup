# attendance.py
# Placeholder module for attendance logic

class AttendanceService:
    def __init__(self):
        self.temp_db = []  # placeholder list acting like a database

    def scan_qr(self, qr_data: str):
        """Simulates reading a QR code and logging attendance."""
        record = {
            "student_id": qr_data,
            "status": "PRESENT"
        }
        self.temp_db.append(record)
        return record

    def get_records(self):
        """Returns all temporary attendance records."""
        return self.temp_db
