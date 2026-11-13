"""Database models for the Student Attendance Management System."""

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date, datetime

db = SQLAlchemy()


class User(db.Model):
    """Authentication user (admin or teacher)."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='teacher')  # admin | teacher | student

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'role': self.role}


class Student(db.Model):
    """Student record."""
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    roll_number = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    year = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), nullable=False)

    attendances = db.relationship('Attendance', backref='student', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'roll_number': self.roll_number,
            'name': self.name,
            'department': self.department,
            'year': self.year,
            'email': self.email,
        }


class Attendance(db.Model):
    """Daily attendance record for a student."""
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(10), nullable=False)  # present | absent

    __table_args__ = (
        db.UniqueConstraint('student_id', 'date', name='uq_student_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'roll_number': self.student.roll_number if self.student else None,
            'date': self.date.isoformat(),
            'status': self.status,
        }


class Ticket(db.Model):
    """Dispute ticket raised by a student for attendance correction."""
    __tablename__ = 'tickets'

    id = db.Column(db.Integer, primary_key=True)
    attendance_id = db.Column(db.Integer, db.ForeignKey('attendance.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='open')  # open | resolved | rejected
    resolution_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    attendance = db.relationship('Attendance', lazy=True)
    student = db.relationship('Student', lazy=True)
    resolved_by = db.relationship('User', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('attendance_id', 'student_id', name='uq_ticket_attendance_student'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'attendance_id': self.attendance_id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'roll_number': self.student.roll_number if self.student else None,
            'attendance_date': self.attendance.date.isoformat() if self.attendance else None,
            'attendance_status': self.attendance.status if self.attendance else None,
            'message': self.message,
            'status': self.status,
            'resolution_note': self.resolution_note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolved_by_username': self.resolved_by.username if self.resolved_by else None,
        }


class LeaveRequest(db.Model):
    """Student leave application (regular leave, OD, emergency leave)."""
    __tablename__ = 'leave_requests'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    request_type = db.Column(db.String(20), nullable=False)  # leave | od | emergency
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending | approved | rejected
    review_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    student = db.relationship('Student', lazy=True)
    reviewed_by = db.relationship('User', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'roll_number': self.student.roll_number if self.student else None,
            'request_type': self.request_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'reason': self.reason,
            'status': self.status,
            'review_note': self.review_note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewed_by_username': self.reviewed_by.username if self.reviewed_by else None,
        }


class Document(db.Model):
    """Uploaded document linked to a student or stored for class records."""
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=True)
    doc_type = db.Column(db.String(50), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    mime_type = db.Column(db.String(120), nullable=True)
    uploaded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    uploaded_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    student = db.relationship('Student', lazy=True)
    uploaded_by = db.relationship('User', foreign_keys=[uploaded_by_user_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'roll_number': self.student.roll_number if self.student else None,
            'title': self.title,
            'description': self.description,
            'doc_type': self.doc_type,
            'original_filename': self.original_filename,
            'mime_type': self.mime_type,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'uploaded_by_username': self.uploaded_by.username if self.uploaded_by else None,
            'download_url': f'/api/documents/{self.id}/download',
        }
