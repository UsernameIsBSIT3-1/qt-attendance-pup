import tkinter as tk
from tkinter import ttk, messagebox

from backend.attendance import AttendanceService
from backend.database import Database
from backend.qr_scanner import QRScanner


class AppGUI:
    def __init__(self):
        self.window = tk.Tk()
        self.window.title("QR Attendance System")
        self.window.geometry("900x500")
        self.window.configure(bg="#F5F5F5")

        # backend
        self.db = Database()
        self.attendance = AttendanceService(self.db)
        self.scanner = QRScanner()

        # layout
        self.create_sidebar()
        self.create_header()
        self.create_main_content()

    # ---------------------------
    # SIDEBAR
    # ---------------------------
    def create_sidebar(self):
        self.sidebar = tk.Frame(self.window, bg="#2C3E50", width=200)
        self.sidebar.pack(side="left", fill="y")

        title = tk.Label(self.sidebar, text="MENU", fg="white",
                         bg="#2C3E50", font=("Arial", 16, "bold"), pady=20)
        title.pack()

        btn1 = tk.Button(self.sidebar, text="Dashboard", bg="#34495E", fg="white",
                         font=("Arial", 12), relief="flat", pady=10)
        btn1.pack(fill="x", padx=10, pady=5)

        btn2 = tk.Button(self.sidebar, text="Attendance", bg="#34495E", fg="white",
                         font=("Arial", 12), relief="flat", pady=10)
        btn2.pack(fill="x", padx=10, pady=5)

        btn3 = tk.Button(self.sidebar, text="Settings", bg="#34495E", fg="white",
                         font=("Arial", 12), relief="flat", pady=10)
        btn3.pack(fill="x", padx=10, pady=5)

    # ---------------------------
    # TOP HEADER BAR
    # ---------------------------
    def create_header(self):
        self.header = tk.Frame(self.window, bg="white", height=60)
        self.header.pack(fill="x")

        label = tk.Label(self.header, text="QR Attendance System",
                         bg="white", fg="#2C3E50",
                         font=("Arial", 18, "bold"))
        label.pack(pady=10)

    # ---------------------------
    # MAIN CONTENT AREA
    # ---------------------------
    def create_main_content(self):
        self.main_frame = tk.Frame(self.window, bg="#F5F5F5")
        self.main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        # Buttons row
        btn_frame = tk.Frame(self.main_frame, bg="#F5F5F5")
        btn_frame.pack(anchor="w")

        connect_btn = tk.Button(btn_frame, text="Connect DB",
                                bg="#3498DB", fg="white",
                                padx=15, pady=8,
                                font=("Arial", 11, "bold"),
                                command=self.connect_db)
        connect_btn.grid(row=0, column=0, padx=5)

        scan_btn = tk.Button(btn_frame, text="Scan QR",
                             bg="#27AE60", fg="white",
                             padx=15, pady=8,
                             font=("Arial", 11, "bold"),
                             command=self.simulate_scan)
        scan_btn.grid(row=0, column=1, padx=5)

        refresh_btn = tk.Button(btn_frame, text="Refresh",
                                bg="#E67E22", fg="white",
                                padx=15, pady=8,
                                font=("Arial", 11, "bold"),
                                command=self.refresh_records)
        refresh_btn.grid(row=0, column=2, padx=5)

        # Table card container
        card = tk.Frame(self.main_frame, bg="white", bd=1, relief="solid")
        card.pack(fill="both", expand=True, pady=20)

        self.table = ttk.Treeview(card, columns=("id", "status"), show="headings")
        self.table.heading("id", text="Student ID")
        self.table.heading("status", text="Status")
        self.table.column("id", width=200)
        self.table.column("status", width=100)
        self.table.pack(fill="both", expand=True)

    # ---------------------------
    # BACKEND CONNECTED BUTTONS
    # ---------------------------
    def connect_db(self):
        msg = self.db.connect()
        messagebox.showinfo("Database", msg)

    def simulate_scan(self):
        qr_data = self.scanner.read_qr("sample_qr.png")
        record = self.attendance.log_attendance(qr_data)
        messagebox.showinfo("Scan", f"Logged: {record['student_id']}")
        self.refresh_records()

    def refresh_records(self):
        for row in self.table.get_children():
            self.table.delete(row)

        for r in self.attendance.view_records():
            self.table.insert("", "end", values=(r["student_id"], r["status"]))

    # ---------------------------
    # RUN
    # ---------------------------
    def run(self):
        self.window.mainloop()
