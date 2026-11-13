#!/usr/bin/env python3
"""
Reset a user's password in attendance.db

Usage:
    python reset_password.py USERNAME NEWPASSWORD

Example:
    python reset_password.py CS1 student123
"""
import sys
import os
import sqlite3
try:
    from werkzeug.security import generate_password_hash
except Exception as e:
    print('Missing dependency: werkzeug is required. Run: pip install -r requirements.txt')
    raise

if len(sys.argv) < 3:
    print("Usage: python reset_password.py USERNAME NEWPASSWORD")
    sys.exit(2)

username = sys.argv[1]
new_password = sys.argv[2]

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(BASE_DIR, 'attendance.db')
if not os.path.exists(db_path):
    print('DB not found:', db_path)
    sys.exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
new_hash = generate_password_hash(new_password)
cur.execute("UPDATE users SET password_hash=? WHERE lower(username)=lower(?)", (new_hash, username.lower()))
conn.commit()
print('rows updated:', cur.rowcount)
conn.close()
