# 🎓 Campus Lost & Found Web Portal

> **VTU Societal Project Syllabus - Project No. 8 (Lost and Found Application)**  
> A lightweight, zero-dependency, secure web platform enabling college students and faculty to report misplaced belongings, verify legitimate ownership, and coordinate safe handovers.

---

## ⚡ Quick Start (Run Locally)

This application is built with **zero external dependencies** (using Python 3 standard library + SQLite). No `npm install` or `pip install` required!

### 1. Launch Server
Open your terminal in this directory and run:
```bash
python3 server.py
```
*(By default, it runs on `http://127.0.0.1:8000`)*

### 2. Open in Browser
Visit **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in Chrome, Safari, Firefox, or Edge.

---

## 🔑 Pre-Seeded Demo Accounts

You can log in instantly using the **Quick Demo Mode** bar at the top of the webpage, or use these credentials:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Faculty Coordinator (Admin)** | Prof. K. Sharma | `admin@college.edu.in` | `admin123` |
| **Student 1** | Yashwanth D. T. | `yashwanth@college.edu.in` | `student123` |
| **Student 2** | Ananya Rao | `ananya@college.edu.in` | `student123` |
| **Student 3** | Rahul Verma | `rahul@college.edu.in` | `student123` |

---

## 🌟 Key Features & Societal Workflow

### 1. Report Lost & Found Items
- **Report Lost Item:** Title, Category, Last Seen Location, Approximate Date, Description, and Photo.
- **Report Found Item:** In addition to general details, includes a **Private Verification Clue** (e.g., hidden sticker, scratch, lockscreen wallpaper, or internal contents) that is **hidden from public view** to prevent fraudulent claims.

### 2. Two-Step Ownership Verification & Claim System
- When someone clicks **"Claim This Item"**, they are required to describe identifying proof matching the hidden secret clue.
- The finder can review all submitted claims and **Approve** or **Reject** them.

### 3. Campus Safe Handover Protocol
- Prominently advises students against isolated 1-on-1 private meetups.
- Official handovers are routed via the **Campus Main Security Booth** or the **Department HOD Office**.

### 4. Search, Filter & History
- Real-time search by keywords, category dropdown, campus landmark filter, and status toggle (`All`, `Lost`, `Found`, `Resolved`).

### 5. In-App Notification Center
- Finders receive instant notifications when claims are filed.
- Claimants receive status updates (Approved/Rejected) and pickup instructions.

### 6. Admin & Faculty Coordinator Panel
- Comprehensive analytics: Total reports, Lost vs. Found ratio, Total Claims, and **Campus Recovery Rate (%)**.
- Moderation tools to delete spam, inappropriate entries, or resolve disputed items.

---

## 🗄️ Database Architecture (SQLite)

- `users`: Student/admin profile, college email, USN, department, salted SHA-256 hash.
- `sessions`: Bearer token and cookie session store.
- `items`: Lost and found reports, public descriptions, private verification clue, status.
- `claims`: Claimant proof, approval/rejection status, and finder audit trail.
- `notifications`: User alert feed for real-time status updates.

---

## 🧪 Running Automated Tests

Run the included verification test suite:
```bash
python3 test_app.py
```
*Output: 5 tests passing in < 0.01 seconds.*
