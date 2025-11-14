# System Architecture (Draft)

## Overview
The system follows a three-layer architecture:

1. **Presentation Layer (Frontend)**
   - Handles QR scanning UI
   - Displays attendance results
   - Communicates with backend services

2. **Application Layer (Backend Services)**
   - AttendanceService manages attendance logic
   - QRScannerService handles scanning operations
   - Database module simulates temporary DB connections

3. **Data Layer**
   - Will contain SQL database integration
   - Temporary placeholder structures are used for simulation

## Planned Modules
- Authentication & Login
- Attendance Scanner
- Attendance Record Management
- Reporting Module
- Admin Panel
