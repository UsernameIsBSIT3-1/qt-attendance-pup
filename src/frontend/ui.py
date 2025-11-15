# ui.py
from backend.attendance import AttendanceService
from backend.database import Database
from backend.qr_scanner import QRScanner

class UI:
    def __init__(self):
        self.db = Database()
        self.attendance = AttendanceService(self.db)
        self.scanner = QRScanner()

    def launch(self):
        print("=== QR Attendance System (Prototype) ===")
        print("1. Connect to Database")
        print("2. Simulate QR Scan")
        print("3. View Attendance Records")
        print("4. Exit")

        while True:
            choice = input("\nSelect an option: ")

            if choice == "1":
                print(self.db.connect())

            elif choice == "2":
                qr = self.scanner.read_qr("sample_qr.png")
                result = self.attendance.log_attendance(qr)
                print("Logged:", result)

            elif choice == "3":
                records = self.attendance.view_records()
                print("\n--- Attendance Records ---")
                for r in records:
                    print(r)

            elif choice == "4":
                print("Goodbye!")
                break

            else:
                print("Invalid choice.")
