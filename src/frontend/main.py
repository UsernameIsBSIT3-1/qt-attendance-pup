# main.py
# Placeholder for the UI module

from backend.attendance import AttendanceService

def launch_ui():
    print("Launching placeholder UI...")
    attendance = AttendanceService()
    
    # placeholder simulated scan
    example_scan = attendance.scan_qr("2025001234")
    print("Scanned:", example_scan)

if __name__ == "__main__":
    launch_ui()
