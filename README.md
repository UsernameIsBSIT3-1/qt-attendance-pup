# PUP QR Attendance System v2.0

A complete, full-stack Attendance Management System built for PUP. Features role-based access control (Admin, Professor, Student), QR code scanning, analytics dashboards, and report generation.

## 🚀 Features

### 🎓 Student Portal
- **Dashboard**: View attendance stats (Present/Late/Absent), visual charts, and recent history.
- **My Calendar**: Visual calendar showing attendance dots for every day of the month.
- **Digital ID**: Auto-generated QR code for scanning.
- **Dark Mode**: Fully supported UI with toggle.

### 👨‍🏫 Professor Portal
- **Smart Analytics**: View "Class Health", attendance rates per student, and trends over the last 7 days.
- **Scanner**: Built-in QR scanner with camera support and manual entry fallback.
- **Class Details**: Deep dive into specific sections with student rosters and progress bars.
- **Reports**: Filterable logs with CSV export.

### 🛡️ Admin Panel
- **User Management**: Create, Edit, Delete users (Students/Profs). Bulk Import via CSV.
- **Course Management**: Manage subjects and codes.
- **Enrollment**: Assign students to courses easily.
- **System Maintenance**: Purge logs for new semesters and backup data.

---

## 🛠️ Installation

1. **Install Dependencies**
   Open a terminal in the project folder and run:
   ```bash
   npm install