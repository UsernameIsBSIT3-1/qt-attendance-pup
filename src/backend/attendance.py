class AttendanceService:
    def __init__(self, db):
        self.db = db

    def log_attendance(self, student_id):
        record = {
            "student_id": student_id,
            "status": "PRESENT"
        }
        self.db.insert(record)
        return record

    def view_records(self):
        return self.db.fetch_all()
