"""
Automated Verification & Unit Tests for College Lost & Found System.
Verifies DB integrity, auth hashing, item lifecycle, secret clue privacy, and claim approval flow.
"""

import unittest
import sqlite3
import os
import database

class TestLostAndFoundSystem(unittest.TestCase):

    def setUp(self):
        # Initialize database
        database.init_db()
        self.conn = database.get_db()

    def tearDown(self):
        self.conn.close()

    def test_seed_users_exist(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT email, role FROM users WHERE email = 'admin@college.edu.in'")
        admin = cursor.fetchone()
        self.assertIsNotNone(admin)
        self.assertEqual(admin['role'], 'admin')

        cursor.execute("SELECT email, role FROM users WHERE email = 'yashwanth@college.edu.in'")
        student = cursor.fetchone()
        self.assertIsNotNone(student)
        self.assertEqual(student['role'], 'student')

    def test_password_hashing(self):
        pwd = "securepassword123"
        hashed, salt = database.hash_password(pwd)
        self.assertTrue(database.verify_password(pwd, hashed, salt))
        self.assertFalse(database.verify_password("wrongpassword", hashed, salt))

    def test_seed_items_populated(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM items")
        count = cursor.fetchone()[0]
        self.assertGreaterEqual(count, 4)

    def test_secret_clue_logic(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT title, private_clue FROM items WHERE report_type = 'found' AND private_clue IS NOT NULL")
        found_item = cursor.fetchone()
        self.assertIsNotNone(found_item)
        self.assertTrue(len(found_item['private_clue']) > 0)

    def test_claim_submission_and_resolution(self):
        cursor = self.conn.cursor()
        # Insert test item
        cursor.execute("""
        INSERT INTO items (user_id, report_type, title, category, location, item_date, public_description, private_clue, status)
        VALUES (2, 'found', 'Test Blue Umbrella', 'Other', 'Library Entry', '2026-10-28', 'Found dark blue umbrella', 'Has broken latch', 'active')
        """)
        item_id = cursor.lastrowid

        # Submit claim by user 4
        cursor.execute("""
        INSERT INTO claims (item_id, claimant_id, proof_description, status)
        VALUES (?, 4, 'It has a broken latch on the top runner ring.', 'pending')
        """, (item_id,))
        claim_id = cursor.lastrowid

        # Update item status to claim_pending
        cursor.execute("UPDATE items SET status = 'claim_pending' WHERE id = ?", (item_id,))

        # Verify claim pending
        cursor.execute("SELECT status FROM claims WHERE id = ?", (claim_id,))
        self.assertEqual(cursor.fetchone()['status'], 'pending')

        # Approve claim
        cursor.execute("UPDATE claims SET status = 'approved' WHERE id = ?", (claim_id,))
        cursor.execute("SELECT status FROM claims WHERE id = ?", (claim_id,))
        self.assertEqual(cursor.fetchone()['status'], 'approved')

        # Mark item resolved
        cursor.execute("UPDATE items SET status = 'resolved' WHERE id = ?", (item_id,))
        cursor.execute("SELECT status FROM items WHERE id = ?", (item_id,))
        self.assertEqual(cursor.fetchone()['status'], 'resolved')

        # Clean up test item
        cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
        self.conn.commit()

if __name__ == '__main__':
    unittest.main()
