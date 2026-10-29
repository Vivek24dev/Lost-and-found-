"""
Database management for College Lost & Found System.
Uses standard library sqlite3 with relational schema and seed data.
"""

import sqlite3
import os
import hashlib
import secrets
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lost_and_found.db")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def hash_password(password: str, salt: str = None) -> tuple:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    test_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return test_hash == hashed

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        usn TEXT,
        department TEXT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT DEFAULT 'student' CHECK(role IN ('student', 'admin')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Sessions Table for cookie-less or bearer token auth
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        report_type TEXT NOT NULL CHECK(report_type IN ('lost', 'found')),
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        item_date TEXT NOT NULL,
        public_description TEXT NOT NULL,
        private_clue TEXT,
        image_url TEXT,
        contact_preference TEXT DEFAULT 'In-App Claim',
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'claim_pending', 'resolved')),
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Claims Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        claimant_id INTEGER NOT NULL,
        proof_description TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        finder_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Notifications Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
    );
    """)

    conn.commit()

    # Seed demo users & items if table is empty
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)

    conn.close()

def seed_data(conn):
    cursor = conn.cursor()
    # 1. Admin user
    admin_hash, admin_salt = hash_password("admin123")
    cursor.execute("""
    INSERT INTO users (full_name, email, usn, department, password_hash, salt, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("Prof. K. Sharma (Coordinator)", "admin@college.edu.in", "FAC001", "Computer Science", admin_hash, admin_salt, "admin"))

    # 2. Student 1 (Yashwanth)
    s1_hash, s1_salt = hash_password("student123")
    cursor.execute("""
    INSERT INTO users (full_name, email, usn, department, password_hash, salt, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("Yashwanth D. T.", "yashwanth@college.edu.in", "1VT21CS089", "Computer Science", s1_hash, s1_salt, "student"))

    # 3. Student 2 (Ananya)
    s2_hash, s2_salt = hash_password("student123")
    cursor.execute("""
    INSERT INTO users (full_name, email, usn, department, password_hash, salt, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("Ananya Rao", "ananya@college.edu.in", "1VT21EC045", "Electronics & Comm.", s2_hash, s2_salt, "student"))

    # 4. Student 3 (Rahul)
    s3_hash, s3_salt = hash_password("student123")
    cursor.execute("""
    INSERT INTO users (full_name, email, usn, department, password_hash, salt, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("Rahul Verma", "rahul@college.edu.in", "1VT22ME012", "Mechanical Engg", s3_hash, s3_salt, "student"))

    # Seed Items
    items_data = [
        (
            2, # Yashwanth
            "found",
            "Casio fx-991EX Scientific Calculator",
            "Electronics",
            "CS Block - Lab 3 (Desk 14)",
            "2026-10-27",
            "ClassWiz series black scientific calculator with cover attached. Found left on the corner desk after afternoon lab.",
            "Back cover has a tiny yellow smiley sticker on the top right corner and initials 'R.V.' faintly scratched.",
            "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80",
            "active"
        ),
        (
            3, # Ananya
            "found",
            "College RFID Student ID Card with Lanyard",
            "ID cards",
            "Central Library - Reading Room 2",
            "2026-10-28",
            "Official college blue lanyard with RFID identity card in transparent plastic case.",
            "Card belongs to Mechanical Dept (USN starts with 1VT22ME...). Lanyard has a small Batman metal pin.",
            "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
            "claim_pending"
        ),
        (
            4, # Rahul
            "lost",
            "Titan Brown Leather Wallet",
            "Wallets and purses",
            "Main Canteen or Sports Ground",
            "2026-10-26",
            "Dark brown bifold leather wallet lost between 1:30 PM and 2:30 PM. Contains college bus pass and driver's license.",
            "Inside coin pocket contains a 10 rupee coin and an old metro card.",
            "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
            "active"
        ),
        (
            2, # Yashwanth
            "lost",
            "Boat Airdopes 141 Earbuds Case (Black)",
            "Electronics",
            "Auditorium - Row G",
            "2026-10-25",
            "Black matte charging case with one left earbud inside. Left on the chair during the technical symposium.",
            "Small scratch near the USB-C port.",
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
            "active"
        ),
        (
            3, # Ananya
            "found",
            "Steel Water Bottle (Milton 750ml)",
            "Personal belongings",
            "Mechanical Block Ground Floor Water Cooler",
            "2026-10-24",
            "Silver stainless steel Milton bottle with insulated black cap.",
            "Cap has a slight dent on the rim.",
            "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
            "resolved"
        ),
        (
            4, # Rahul
            "lost",
            "Data Structures & Algorithms in C++ (Mark Allen Weiss)",
            "Books and notebooks",
            "CS Dept Library Rack B",
            "2026-10-22",
            "Hardcover reference book with sticky notes on Tree Traversals and Graph algorithms chapters.",
            "First page has library stamp dated 12 Sept 2026.",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
            "resolved"
        )
    ]

    for item in items_data:
        cursor.execute("""
        INSERT INTO items (user_id, report_type, title, category, location, item_date, public_description, private_clue, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, item)

    # Seed a pending claim on item 2 (ID Card) by Rahul (user 4)
    cursor.execute("""
    INSERT INTO claims (item_id, claimant_id, proof_description, status)
    VALUES (2, 4, 'This is my ID card! My USN is 1VT22ME012, and my lanyard has a small black Batman badge near the clip.', 'pending')
    """)

    # Seed notification for Ananya (user 3, finder of ID card)
    cursor.execute("""
    INSERT INTO notifications (user_id, item_id, title, message)
    VALUES (3, 2, 'New Claim Request', 'Rahul Verma has submitted an ownership claim for your found item: College RFID Student ID Card.')
    """)

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_FILE)
