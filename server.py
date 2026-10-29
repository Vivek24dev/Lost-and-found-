#!/usr/bin/env python3
"""
High-performance, zero-dependency Full-Stack Server for College Lost & Found.
Standard library only: http.server, sqlite3, json, hashlib, mimetypes.
"""

import os
import sys
import json
import uuid
import base64
import mimetypes
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Import DB helpers
from database import get_db, init_db, hash_password, verify_password

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

def parse_auth_token(headers):
    # Check Authorization: Bearer <token>
    auth_header = headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:].strip()
    # Check Cookie: session_token=<token>
    cookie_header = headers.get('Cookie', '')
    if 'session_token=' in cookie_header:
        parts = cookie_header.split(';')
        for part in parts:
            part = part.strip()
            if part.startswith('session_token='):
                return part.split('=', 1)[1]
    return None

def get_current_user(headers):
    token = parse_auth_token(headers)
    if not token:
        return None
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT u.id, u.full_name, u.email, u.usn, u.department, u.role
    FROM users u
    JOIN sessions s ON u.id = s.user_id
    WHERE s.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

class LostAndFoundHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} - {args[1]} - {args[2]}\n")

    def send_json(self, data, status=200, cookie_token=None):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        if cookie_token:
            self.send_header('Set-Cookie', f'session_token={cookie_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000')
        self.end_headers()
        self.wfile.write(payload)

    def send_error_json(self, message, status=400):
        self.send_json({"error": message, "success": False}, status=status)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.end_headers()

    def read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                return {}
            raw_body = self.rfile.read(content_length).decode('utf-8')
            return json.loads(raw_body)
        except Exception:
            return None

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # ---------------- API ROUTES ----------------
        if path == '/api/auth/me':
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.send_json({"user": user, "success": True})

        elif path == '/api/items':
            return self.handle_get_items(query)

        elif path.startswith('/api/items/') and len(path.split('/')) == 4:
            item_id = path.split('/')[3]
            return self.handle_get_item_details(item_id)

        elif path == '/api/my/reports':
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_get_my_reports(user['id'])

        elif path == '/api/my/claims':
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_get_my_claims(user['id'])

        elif path == '/api/notifications':
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_get_notifications(user['id'])

        elif path == '/api/admin/stats':
            user = get_current_user(self.headers)
            if not user or user['role'] != 'admin':
                return self.send_error_json("Forbidden: Admin access required", status=403)
            return self.handle_get_admin_stats()

        # ---------------- STATIC FILE SERVING ----------------
        self.handle_static_files(path)

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == '/api/auth/register':
            return self.handle_register()

        elif path == '/api/auth/login':
            return self.handle_login()

        elif path == '/api/auth/logout':
            return self.handle_logout()

        elif path == '/api/items':
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Please log in to report an item.", status=401)
            return self.handle_create_item(user['id'])

        elif path.startswith('/api/items/') and path.endswith('/claim'):
            parts = path.split('/')
            if len(parts) == 5:
                item_id = parts[3]
                user = get_current_user(self.headers)
                if not user:
                    return self.send_error_json("Please log in to claim an item.", status=401)
                return self.handle_claim_item(item_id, user['id'])

        elif path.startswith('/api/notifications/') and path.endswith('/read'):
            parts = path.split('/')
            notif_id = parts[3]
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_mark_notification_read(notif_id, user['id'])

        elif path == '/api/notifications/read-all':
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_mark_all_notifications_read(user['id'])

        elif path == '/api/upload':
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_file_upload()

        self.send_error_json("Not Found", status=404)

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith('/api/items/') and path.endswith('/status'):
            parts = path.split('/')
            item_id = parts[3]
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_update_item_status(item_id, user)

        elif path.startswith('/api/claims/') and path.endswith('/status'):
            parts = path.split('/')
            claim_id = parts[3]
            user = get_current_user(self.headers)
            if not user:
                return self.send_error_json("Unauthorized", status=401)
            return self.handle_update_claim_status(claim_id, user)

        self.send_error_json("Not Found", status=404)

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith('/api/items/'):
            parts = path.split('/')
            if len(parts) == 4:
                item_id = parts[3]
                user = get_current_user(self.headers)
                if not user:
                    return self.send_error_json("Unauthorized", status=401)
                return self.handle_delete_item(item_id, user)

        self.send_error_json("Not Found", status=404)

    # ---------------- HANDLER IMPLEMENTATIONS ----------------

    def handle_register(self):
        body = self.read_json_body()
        if not body:
            return self.send_error_json("Invalid request body.")

        full_name = body.get('full_name', '').strip()
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        usn = body.get('usn', '').strip().upper()
        department = body.get('department', '').strip()

        if not full_name or not email or not password:
            return self.send_error_json("Name, email, and password are required.")

        if len(password) < 6:
            return self.send_error_json("Password must be at least 6 characters.")

        # Societal Project Recommendation: Restrict to college email or valid format
        if "@" not in email or "." not in email:
            return self.send_error_json("Please provide a valid college email address.")

        conn = get_db()
        cursor = conn.cursor()
        try:
            pwd_hash, salt = hash_password(password)
            role = 'admin' if email.startswith('admin@') else 'student'
            cursor.execute("""
            INSERT INTO users (full_name, email, usn, department, password_hash, salt, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (full_name, email, usn, department, pwd_hash, salt, role))
            user_id = cursor.lastrowid

            # Create session
            token = str(uuid.uuid4())
            cursor.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
            conn.commit()

            user_obj = {
                "id": user_id,
                "full_name": full_name,
                "email": email,
                "usn": usn,
                "department": department,
                "role": role
            }
            conn.close()
            return self.send_json({"user": user_obj, "token": token, "success": True}, status=201, cookie_token=token)
        except Exception as e:
            conn.close()
            if "UNIQUE constraint failed" in str(e):
                return self.send_error_json("An account with this email already exists.")
            return self.send_error_json(f"Registration failed: {str(e)}")

    def handle_login(self):
        body = self.read_json_body()
        if not body:
            return self.send_error_json("Invalid request body.")

        email = body.get('email', '').strip().lower()
        password = body.get('password', '')

        if not email or not password:
            return self.send_error_json("Email and password are required.")

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, full_name, email, usn, department, role, password_hash, salt FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()

        if not row or not verify_password(password, row['password_hash'], row['salt']):
            conn.close()
            return self.send_error_json("Invalid email or password.", status=401)

        token = str(uuid.uuid4())
        cursor.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, row['id']))
        conn.commit()

        user_obj = {
            "id": row['id'],
            "full_name": row['full_name'],
            "email": row['email'],
            "usn": row['usn'],
            "department": row['department'],
            "role": row['role']
        }
        conn.close()
        return self.send_json({"user": user_obj, "token": token, "success": True}, cookie_token=token)

    def handle_logout(self):
        token = parse_auth_token(self.headers)
        if token:
            conn = get_db()
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            conn.close()
        return self.send_json({"success": True, "message": "Logged out successfully"})

    def handle_get_items(self, query):
        current_user = get_current_user(self.headers)
        conn = get_db()
        cursor = conn.cursor()

        sql = """
        SELECT i.*, u.full_name as reporter_name, u.email as reporter_email,
               (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id) as claim_count
        FROM items i
        JOIN users u ON i.user_id = u.id
        WHERE 1=1
        """
        params = []

        # Filter: type
        report_type = query.get('type', ['all'])[0]
        if report_type in ('lost', 'found'):
            sql += " AND i.report_type = ?"
            params.append(report_type)

        # Filter: status
        status = query.get('status', ['all'])[0]
        if status in ('active', 'claim_pending', 'resolved'):
            sql += " AND i.status = ?"
            params.append(status)
        elif status == 'active_only':
            sql += " AND i.status != 'resolved'"

        # Filter: category
        category = query.get('category', ['all'])[0]
        if category and category != 'all':
            sql += " AND i.category = ?"
            params.append(category)

        # Filter: location
        location = query.get('location', ['all'])[0]
        if location and location != 'all':
            sql += " AND i.location LIKE ?"
            params.append(f"%{location}%")

        # Search keyword
        search = query.get('search', [''])[0].strip()
        if search:
            sql += " AND (i.title LIKE ? OR i.public_description LIKE ? OR i.location LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term])

        # Sort
        sort_order = query.get('sort', ['newest'])[0]
        if sort_order == 'oldest':
            sql += " ORDER BY i.created_at ASC"
        else:
            sql += " ORDER BY i.created_at DESC"

        cursor.execute(sql, params)
        rows = cursor.fetchall()

        items = []
        for r in rows:
            item = dict(r)
            # PRIVACY / SECURITY ENFORCEMENT:
            # Mask private_clue unless the current user is the owner or an admin
            is_owner = current_user and (current_user['id'] == item['user_id'] or current_user['role'] == 'admin')
            if not is_owner:
                item['private_clue'] = None
                item['reporter_email'] = None # Protect personal email from public display
            items.append(item)

        conn.close()
        return self.send_json({"items": items, "count": len(items), "success": True})

    def handle_get_item_details(self, item_id):
        current_user = get_current_user(self.headers)
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
        SELECT i.*, u.full_name as reporter_name, u.email as reporter_email, u.department as reporter_dept
        FROM items i
        JOIN users u ON i.user_id = u.id
        WHERE i.id = ?
        """, (item_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return self.send_error_json("Item not found", status=404)

        item = dict(row)
        is_owner_or_admin = current_user and (current_user['id'] == item['user_id'] or current_user['role'] == 'admin')

        if not is_owner_or_admin:
            item['private_clue'] = None
            item['reporter_email'] = None

        # Fetch claims if owner or admin
        claims = []
        if is_owner_or_admin:
            cursor.execute("""
            SELECT c.*, u.full_name as claimant_name, u.email as claimant_email, u.usn as claimant_usn, u.department as claimant_dept
            FROM claims c
            JOIN users u ON c.claimant_id = u.id
            WHERE c.item_id = ?
            ORDER BY c.created_at DESC
            """, (item_id,))
            claims = [dict(c) for c in cursor.fetchall()]

        # Check if current user already submitted a claim for this item
        user_claim = None
        if current_user and not is_owner_or_admin:
            cursor.execute("SELECT * FROM claims WHERE item_id = ? AND claimant_id = ?", (item_id, current_user['id']))
            uc_row = cursor.fetchone()
            if uc_row:
                user_claim = dict(uc_row)

        conn.close()
        return self.send_json({
            "item": item,
            "claims": claims,
            "user_claim": user_claim,
            "is_owner": is_owner_or_admin,
            "success": True
        })

    def handle_create_item(self, user_id):
        body = self.read_json_body()
        if not body:
            return self.send_error_json("Invalid request body.")

        report_type = body.get('report_type')
        title = body.get('title', '').strip()
        category = body.get('category', '').strip()
        location = body.get('location', '').strip()
        item_date = body.get('item_date', '').strip()
        public_description = body.get('public_description', '').strip()
        private_clue = body.get('private_clue', '').strip()
        image_url = body.get('image_url', '').strip()
        contact_preference = body.get('contact_preference', 'In-App Claim')

        if not report_type or report_type not in ('lost', 'found'):
            return self.send_error_json("Report type must be 'lost' or 'found'.")
        if not title or not category or not location or not item_date or not public_description:
            return self.send_error_json("All required fields (title, category, location, date, description) must be filled.")

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO items (user_id, report_type, title, category, location, item_date, public_description, private_clue, image_url, contact_preference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        """, (user_id, report_type, title, category, location, item_date, public_description, private_clue, image_url, contact_preference))
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return self.send_json({"id": new_id, "message": "Report submitted successfully!", "success": True}, status=201)

    def handle_update_item_status(self, item_id, user):
        body = self.read_json_body()
        new_status = body.get('status')
        if new_status not in ('active', 'claim_pending', 'resolved'):
            return self.send_error_json("Invalid status value.")

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, title FROM items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return self.send_error_json("Item not found", status=404)

        if row['user_id'] != user['id'] and user['role'] != 'admin':
            conn.close()
            return self.send_error_json("Permission denied: You can only update your own reports.", status=403)

        resolved_at = datetime.now().isoformat() if new_status == 'resolved' else None
        cursor.execute("UPDATE items SET status = ?, resolved_at = ? WHERE id = ?", (new_status, resolved_at, item_id))
        conn.commit()
        conn.close()

        return self.send_json({"message": f"Status updated to {new_status}", "success": True})

    def handle_delete_item(self, item_id, user):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return self.send_error_json("Item not found", status=404)

        if row['user_id'] != user['id'] and user['role'] != 'admin':
            conn.close()
            return self.send_error_json("Permission denied: You can only delete your own reports.", status=403)

        cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return self.send_json({"message": "Item report removed successfully.", "success": True})

    def handle_claim_item(self, item_id, claimant_id):
        body = self.read_json_body()
        proof_description = body.get('proof_description', '').strip()
        if not proof_description:
            return self.send_error_json("Please provide proof / identifying details to claim this item.")

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, user_id, title, status, report_type FROM items WHERE id = ?", (item_id,))
        item = cursor.fetchone()
        if not item:
            conn.close()
            return self.send_error_json("Item not found", status=404)

        if item['report_type'] != 'found':
            conn.close()
            return self.send_error_json("Claims can only be filed on 'Found' items.")

        if item['user_id'] == claimant_id:
            conn.close()
            return self.send_error_json("You cannot submit a claim on an item you reported.")

        # Check existing claim
        cursor.execute("SELECT id FROM claims WHERE item_id = ? AND claimant_id = ?", (item_id, claimant_id))
        if cursor.fetchone():
            conn.close()
            return self.send_error_json("You have already submitted a claim for this item.")

        # Insert claim
        cursor.execute("""
        INSERT INTO claims (item_id, claimant_id, proof_description, status)
        VALUES (?, ?, ?, 'pending')
        """, (item_id, claimant_id, proof_description))
        claim_id = cursor.lastrowid

        # Update item status to 'claim_pending' if active
        if item['status'] == 'active':
            cursor.execute("UPDATE items SET status = 'claim_pending' WHERE id = ?", (item_id,))

        # Get claimant name
        cursor.execute("SELECT full_name FROM users WHERE id = ?", (claimant_id,))
        claimant_name = cursor.fetchone()['full_name']

        # Notify the finder
        cursor.execute("""
        INSERT INTO notifications (user_id, item_id, title, message)
        VALUES (?, ?, 'New Claim Received', ?)
        """, (item['user_id'], item_id, f"{claimant_name} submitted an ownership claim for your found item: '{item['title']}'."))

        conn.commit()
        conn.close()

        return self.send_json({
            "claim_id": claim_id,
            "message": "Claim submitted successfully. The finder has been notified.",
            "success": True
        }, status=201)

    def handle_update_claim_status(self, claim_id, user):
        body = self.read_json_body()
        new_status = body.get('status')
        finder_response = body.get('response', '').strip()

        if new_status not in ('approved', 'rejected'):
            return self.send_error_json("Status must be 'approved' or 'rejected'.")

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.*, i.user_id as finder_id, i.title as item_title, u.email as finder_email, u.full_name as finder_name
        FROM claims c
        JOIN items i ON c.item_id = i.id
        JOIN users u ON i.user_id = u.id
        WHERE c.id = ?
        """, (claim_id,))
        claim = cursor.fetchone()
        if not claim:
            conn.close()
            return self.send_error_json("Claim not found", status=404)

        if claim['finder_id'] != user['id'] and user['role'] != 'admin':
            conn.close()
            return self.send_error_json("Permission denied: Only the finder or admin can review this claim.", status=403)

        cursor.execute("""
        UPDATE claims
        SET status = ?, finder_response = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """, (new_status, finder_response, claim_id))

        # Notify claimant
        if new_status == 'approved':
            notif_msg = f"Your claim for '{claim['item_title']}' was APPROVED by {claim['finder_name']}! You can coordinate collection at the Campus Security Booth or email: {claim['finder_email']}."
        else:
            notif_msg = f"Your claim for '{claim['item_title']}' was rejected. Reason: {finder_response or 'Evidence did not match item details'}."

        cursor.execute("""
        INSERT INTO notifications (user_id, item_id, title, message)
        VALUES (?, ?, ?, ?)
        """, (claim['claimant_id'], claim['item_id'], f"Claim {new_status.capitalize()}", notif_msg))

        conn.commit()
        conn.close()

        return self.send_json({"message": f"Claim status updated to {new_status}.", "success": True})

    def handle_get_my_reports(self, user_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT i.*,
               (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id) as claim_count,
               (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id AND c.status = 'pending') as pending_claims
        FROM items i
        WHERE i.user_id = ?
        ORDER BY i.created_at DESC
        """, (user_id,))
        items = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return self.send_json({"reports": items, "success": True})

    def handle_get_my_claims(self, user_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.*, i.title as item_title, i.report_type, i.location, i.category, i.status as item_status,
               u.full_name as finder_name, u.email as finder_email
        FROM claims c
        JOIN items i ON c.item_id = i.id
        JOIN users u ON i.user_id = u.id
        WHERE c.claimant_id = ?
        ORDER BY c.created_at DESC
        """, (user_id,))
        claims = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return self.send_json({"claims": claims, "success": True})

    def handle_get_notifications(self, user_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
        """, (user_id,))
        notifs = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", (user_id,))
        unread_count = cursor.fetchone()[0]
        conn.close()
        return self.send_json({"notifications": notifs, "unread_count": unread_count, "success": True})

    def handle_mark_notification_read(self, notif_id, user_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notif_id, user_id))
        conn.commit()
        conn.close()
        return self.send_json({"success": True})

    def handle_mark_all_notifications_read(self, user_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return self.send_json({"success": True})

    def handle_get_admin_stats(self):
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM items")
        total_items = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM items WHERE report_type = 'lost'")
        total_lost = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM items WHERE report_type = 'found'")
        total_found = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM items WHERE status = 'resolved'")
        total_resolved = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM claims")
        total_claims = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM claims WHERE status = 'approved'")
        approved_claims = cursor.fetchone()[0]

        recovery_rate = round((total_resolved / total_items * 100), 1) if total_items > 0 else 0

        # Recent items for admin moderation
        cursor.execute("""
        SELECT i.*, u.full_name as reporter_name, u.email as reporter_email
        FROM items i
        JOIN users u ON i.user_id = u.id
        ORDER BY i.created_at DESC
        LIMIT 20
        """)
        recent_items = [dict(r) for r in cursor.fetchall()]

        conn.close()
        return self.send_json({
            "stats": {
                "total_users": total_users,
                "total_items": total_items,
                "total_lost": total_lost,
                "total_found": total_found,
                "total_resolved": total_resolved,
                "total_claims": total_claims,
                "approved_claims": approved_claims,
                "recovery_rate": recovery_rate
            },
            "recent_items": recent_items,
            "success": True
        })

    def handle_file_upload(self):
        body = self.read_json_body()
        if not body or 'data' not in body or 'filename' not in body:
            return self.send_error_json("Image data and filename are required.")

        file_data = body['data']
        # strip base64 header if present: data:image/png;base64,...
        if ',' in file_data:
            file_data = file_data.split(',', 1)[1]

        try:
            binary_data = base64.b64decode(file_data)
            ext = os.path.splitext(body['filename'])[1].lower()
            if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
                ext = '.jpg'
            safe_filename = f"{uuid.uuid4().hex[:12]}{ext}"
            filepath = os.path.join(UPLOADS_DIR, safe_filename)
            with open(filepath, 'wb') as f:
                f.write(binary_data)

            url = f"/static/uploads/{safe_filename}"
            return self.send_json({"url": url, "success": True})
        except Exception as e:
            return self.send_error_json(f"Failed to save image: {str(e)}")

    def handle_static_files(self, path):
        if path == '/' or path == '':
            file_path = os.path.join(STATIC_DIR, "index.html")
        else:
            rel_path = path.lstrip('/')
            file_path = os.path.join(BASE_DIR, rel_path)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            # Fallback to index.html for SPA client navigation
            file_path = os.path.join(STATIC_DIR, "index.html")

        if os.path.exists(file_path) and os.path.isfile(file_path):
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'
            if file_path.endswith('.css'):
                content_type = 'text/css'
            elif file_path.endswith('.js'):
                content_type = 'application/javascript'
            elif file_path.endswith('.html'):
                content_type = 'text/html; charset=utf-8'

            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"404 Not Found")

def run(host='127.0.0.1', port=8000):
    init_db()
    server = ThreadingHTTPServer((host, port), LostAndFoundHandler)
    print(f"\n=======================================================")
    print(f"🎓 Campus Lost & Found Web Portal is running!")
    print(f"🔗 Local URL: http://{host}:{port}")
    print(f"📁 Static Directory: {STATIC_DIR}")
    print(f"=======================================================\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully.")
        server.server_close()

if __name__ == '__main__':
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run(port=port)
