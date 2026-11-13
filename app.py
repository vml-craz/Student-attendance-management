"""
Student Attendance Management System — Flask Backend
=====================================================
Serves both the REST API and the static frontend files.
Run:  python app.py
"""

import os
import uuid
import jwt
import functools
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from models import db, User, Student, Attendance, Ticket, LeaveRequest, Document
from sqlalchemy import func

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'attendance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'attendance-system-secret-key-2026'
app.config['UPLOAD_FOLDER'] = UPLOAD_DIR
CORS(app)
db.init_app(app)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
JWT_ALGORITHM = 'HS256'
JWT_EXP_HOURS = 24


def create_token(user):
    payload = {
        'sub': user.id,
        'role': user.role,
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm=JWT_ALGORITHM)


def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=[JWT_ALGORITHM])
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated


def roles_required(*allowed_roles):
    def decorator(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            role = (request.current_user or {}).get('role')
            if role not in allowed_roles:
                return jsonify({'error': 'Forbidden'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator


def get_current_student():
    """Resolve student profile for logged-in student user.

    Student login is mapped by username == student roll number.
    """
    username = (request.current_user or {}).get('username', '').strip()
    if not username:
        return None
    return Student.query.filter_by(roll_number=username).first()


def make_student_default_password(roll_number):
    # Use a simple shared default password for new student accounts.
    # This matches the default credentials shown in the frontend.
    return "student123"


ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'}


def allowed_document_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_DOCUMENT_EXTENSIONS


def ensure_student_accounts():
    """Backfill missing student login accounts for already existing students."""
    students = Student.query.all()
    for student in students:
        if not User.query.filter_by(username=student.roll_number).first():
            student_user = User(username=student.roll_number, role='student')
            student_user.set_password(make_student_default_password(student.roll_number))
            db.session.add(student_user)

# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    # Perform case-insensitive username lookup to accept different casing from the UI
    user = User.query.filter(func.lower(User.username) == username.lower()).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = create_token(user)
    return jsonify({'token': token, 'user': user.to_dict()})


@app.route('/api/auth/me', methods=['GET'])
@token_required
def me():
    user = User.query.get(request.current_user['sub'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())

# ---------------------------------------------------------------------------
# Student routes
# ---------------------------------------------------------------------------


@app.route('/api/students', methods=['GET'])
@token_required
def get_students():
    if request.current_user.get('role') == 'student':
        student = get_current_student()
        if not student:
            return jsonify({'error': 'Student profile not found for this account'}), 404
        return jsonify([student.to_dict()])

    q = request.args.get('q', '').strip()
    query = Student.query
    if q:
        query = query.filter(
            db.or_(
                Student.name.ilike(f'%{q}%'),
                Student.roll_number.ilike(f'%{q}%'),
            )
        )
    students = query.order_by(Student.roll_number).all()
    return jsonify([s.to_dict() for s in students])


@app.route('/api/students', methods=['POST'])
@token_required
@roles_required('admin', 'teacher')
def add_student():
    data = request.get_json() or {}
    required = ['roll_number', 'name', 'department', 'year', 'email']
    for field in required:
        if not data.get(field, '').strip():
            return jsonify({'error': f'{field} is required'}), 400
    if Student.query.filter_by(roll_number=data['roll_number'].strip()).first():
        return jsonify({'error': 'Roll number already exists'}), 409
    student = Student(
        roll_number=data['roll_number'].strip(),
        name=data['name'].strip(),
        department=data['department'].strip(),
        year=data['year'].strip(),
        email=data['email'].strip(),
    )
    db.session.add(student)

    # Auto-create a login for the student: username == roll number.
    student_username = student.roll_number
    if User.query.filter_by(username=student_username).first():
        return jsonify({'error': 'A user account with this roll number already exists'}), 409
    student_user = User(username=student_username, role='student')
    default_password = make_student_default_password(student.roll_number)
    student_user.set_password(default_password)
    db.session.add(student_user)

    db.session.commit()
    return jsonify({
        'student': student.to_dict(),
        'student_account': {
            'username': student_user.username,
            'password': default_password,
        },
    }), 201


@app.route('/api/students/<int:sid>', methods=['PUT'])
@token_required
@roles_required('admin', 'teacher')
def update_student(sid):
    student = Student.query.get_or_404(sid)
    data = request.get_json() or {}
    old_roll_number = student.roll_number

    if 'roll_number' in data:
        existing = Student.query.filter_by(roll_number=data['roll_number'].strip()).first()
        if existing and existing.id != sid:
            return jsonify({'error': 'Roll number already exists'}), 409
        student.roll_number = data['roll_number'].strip()
    for field in ['name', 'department', 'year', 'email']:
        if field in data:
            setattr(student, field, data[field].strip())

    # Keep student login username in sync with roll number.
    if student.roll_number != old_roll_number:
        account_with_new_username = User.query.filter_by(username=student.roll_number).first()
        if account_with_new_username and account_with_new_username.username != old_roll_number:
            return jsonify({'error': 'Cannot update roll number because that username already exists'}), 409

        student_user = User.query.filter_by(username=old_roll_number, role='student').first()
        if student_user:
            student_user.username = student.roll_number

    db.session.commit()
    return jsonify(student.to_dict())


@app.route('/api/students/<int:sid>', methods=['DELETE'])
@token_required
@roles_required('admin', 'teacher')
def delete_student(sid):
    student = Student.query.get_or_404(sid)

    # Remove the linked student login account if it exists.
    student_user = User.query.filter_by(username=student.roll_number, role='student').first()
    if student_user:
        db.session.delete(student_user)

    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student deleted'})

# ---------------------------------------------------------------------------
# Attendance routes
# ---------------------------------------------------------------------------


@app.route('/api/attendance', methods=['POST'])
@token_required
@roles_required('admin', 'teacher')
def mark_attendance():
    data = request.get_json() or {}
    att_date_str = data.get('date', date.today().isoformat())
    records = data.get('records', [])
    if not records:
        return jsonify({'error': 'No attendance records provided'}), 400
    try:
        att_date = date.fromisoformat(att_date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    created = 0
    updated = 0
    for rec in records:
        student_id = rec.get('student_id')
        status = rec.get('status', '').lower()
        if status not in ('present', 'absent'):
            continue
        existing = Attendance.query.filter_by(student_id=student_id, date=att_date).first()
        if existing:
            existing.status = status
            updated += 1
        else:
            db.session.add(Attendance(student_id=student_id, date=att_date, status=status))
            created += 1
    db.session.commit()
    return jsonify({'message': f'{created} created, {updated} updated', 'date': att_date.isoformat()})


@app.route('/api/attendance', methods=['GET'])
@token_required
def get_attendance():
    att_date = request.args.get('date')
    student_id = request.args.get('student_id')
    month = request.args.get('month')  # format: YYYY-MM

    query = Attendance.query.join(Student)

    if request.current_user.get('role') == 'student':
        student = get_current_student()
        if not student:
            return jsonify({'error': 'Student profile not found for this account'}), 404
        query = query.filter(Attendance.student_id == student.id)

    if att_date:
        try:
            query = query.filter(Attendance.date == date.fromisoformat(att_date))
        except ValueError:
            return jsonify({'error': 'Invalid date'}), 400
    if student_id:
        if request.current_user.get('role') == 'student':
            student = get_current_student()
            if not student:
                return jsonify({'error': 'Student profile not found for this account'}), 404
            if int(student_id) != student.id:
                return jsonify({'error': 'Forbidden'}), 403
            query = query.filter(Attendance.student_id == student.id)
        else:
            query = query.filter(Attendance.student_id == int(student_id))
    if month:
        try:
            y, m = month.split('-')
            start = date(int(y), int(m), 1)
            if int(m) == 12:
                end = date(int(y) + 1, 1, 1)
            else:
                end = date(int(y), int(m) + 1, 1)
            query = query.filter(Attendance.date >= start, Attendance.date < end)
        except (ValueError, IndexError):
            return jsonify({'error': 'Invalid month format (use YYYY-MM)'}), 400

    records = query.order_by(Attendance.date.desc()).all()
    return jsonify([r.to_dict() for r in records])

# ---------------------------------------------------------------------------
# Analytics routes
# ---------------------------------------------------------------------------


@app.route('/api/analytics', methods=['GET'])
@token_required
@roles_required('admin', 'teacher')
def get_analytics():
    students = Student.query.order_by(Student.roll_number).all()
    today = date.today()

    total_students = len(students)
    present_today = Attendance.query.filter_by(date=today, status='present').count()
    absent_today = Attendance.query.filter_by(date=today, status='absent').count()

    # Per-student attendance percentage
    per_student = []
    for s in students:
        total = Attendance.query.filter_by(student_id=s.id).count()
        present = Attendance.query.filter_by(student_id=s.id, status='present').count()
        pct = round((present / total * 100), 1) if total > 0 else 0.0
        per_student.append({
            'student_id': s.id,
            'name': s.name,
            'roll_number': s.roll_number,
            'total_classes': total,
            'present': present,
            'absent': total - present,
            'percentage': pct,
        })

    # Trends — last 30 days
    trends = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        p = Attendance.query.filter_by(date=d, status='present').count()
        a = Attendance.query.filter_by(date=d, status='absent').count()
        if p + a > 0:
            trends.append({'date': d.isoformat(), 'present': p, 'absent': a})

    overall_present = sum(s['present'] for s in per_student)
    overall_total = sum(s['total_classes'] for s in per_student)
    overall_pct = round((overall_present / overall_total * 100), 1) if overall_total > 0 else 0.0

    return jsonify({
        'total_students': total_students,
        'present_today': present_today,
        'absent_today': absent_today,
        'overall_percentage': overall_pct,
        'per_student': per_student,
        'trends': trends,
    })

# ---------------------------------------------------------------------------
# Ticket routes
# ---------------------------------------------------------------------------


@app.route('/api/tickets', methods=['POST'])
@token_required
@roles_required('student')
def create_ticket():
    student = get_current_student()
    if not student:
        return jsonify({'error': 'Student profile not found for this account'}), 404

    data = request.get_json() or {}
    attendance_id = data.get('attendance_id')
    message = (data.get('message') or '').strip()

    if not attendance_id:
        return jsonify({'error': 'attendance_id is required'}), 400
    if not message:
        return jsonify({'error': 'Please describe the issue'}), 400

    attendance = Attendance.query.get(attendance_id)
    if not attendance or attendance.student_id != student.id:
        return jsonify({'error': 'Attendance record not found'}), 404

    existing = Ticket.query.filter_by(attendance_id=attendance.id, student_id=student.id).first()
    if existing:
        return jsonify({'error': 'A ticket is already raised for this attendance record'}), 409

    ticket = Ticket(
        attendance_id=attendance.id,
        student_id=student.id,
        message=message,
        status='open',
    )
    db.session.add(ticket)
    db.session.commit()
    return jsonify(ticket.to_dict()), 201


@app.route('/api/tickets', methods=['GET'])
@token_required
def get_tickets():
    status = (request.args.get('status') or '').strip().lower()
    query = Ticket.query.join(Student)

    if request.current_user.get('role') == 'student':
        student = get_current_student()
        if not student:
            return jsonify({'error': 'Student profile not found for this account'}), 404
        query = query.filter(Ticket.student_id == student.id)

    if status in ('open', 'resolved', 'rejected'):
        query = query.filter(Ticket.status == status)

    tickets = query.order_by(Ticket.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tickets])


@app.route('/api/tickets/<int:ticket_id>/resolve', methods=['PUT'])
@token_required
@roles_required('admin', 'teacher')
def resolve_ticket(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    data = request.get_json() or {}
    status = (data.get('status') or '').strip().lower()
    resolution_note = (data.get('resolution_note') or '').strip()

    if status not in ('resolved', 'rejected'):
        return jsonify({'error': 'status must be resolved or rejected'}), 400
    if not resolution_note:
        return jsonify({'error': 'resolution_note is required'}), 400

    resolver_user = User.query.get(request.current_user['sub'])
    if not resolver_user:
        return jsonify({'error': 'User not found'}), 404

    ticket.status = status
    ticket.resolution_note = resolution_note
    ticket.resolved_at = datetime.utcnow()
    ticket.resolved_by_user_id = resolver_user.id
    db.session.commit()
    return jsonify(ticket.to_dict())

# ---------------------------------------------------------------------------
# Leave routes
# ---------------------------------------------------------------------------


@app.route('/api/leaves', methods=['POST'])
@token_required
@roles_required('student')
def apply_leave():
    student = get_current_student()
    if not student:
        return jsonify({'error': 'Student profile not found for this account'}), 404

    data = request.get_json() or {}
    request_type = (data.get('request_type') or '').strip().lower()
    reason = (data.get('reason') or '').strip()
    start_date_str = (data.get('start_date') or '').strip()
    end_date_str = (data.get('end_date') or '').strip()

    if request_type not in ('leave', 'od', 'emergency'):
        return jsonify({'error': 'request_type must be leave, od, or emergency'}), 400
    if not reason:
        return jsonify({'error': 'reason is required'}), 400
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'start_date and end_date are required'}), 400

    try:
        start_date = date.fromisoformat(start_date_str)
        end_date = date.fromisoformat(end_date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    if end_date < start_date:
        return jsonify({'error': 'end_date cannot be before start_date'}), 400

    leave_request = LeaveRequest(
        student_id=student.id,
        request_type=request_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status='pending',
    )
    db.session.add(leave_request)
    db.session.commit()
    return jsonify(leave_request.to_dict()), 201


@app.route('/api/leaves', methods=['GET'])
@token_required
def get_leaves():
    status = (request.args.get('status') or '').strip().lower()
    request_type = (request.args.get('request_type') or '').strip().lower()
    query = LeaveRequest.query.join(Student)

    if request.current_user.get('role') == 'student':
        student = get_current_student()
        if not student:
            return jsonify({'error': 'Student profile not found for this account'}), 404
        query = query.filter(LeaveRequest.student_id == student.id)

    if status in ('pending', 'approved', 'rejected'):
        query = query.filter(LeaveRequest.status == status)
    if request_type in ('leave', 'od', 'emergency'):
        query = query.filter(LeaveRequest.request_type == request_type)

    leaves = query.order_by(LeaveRequest.created_at.desc()).all()
    return jsonify([l.to_dict() for l in leaves])


@app.route('/api/leaves/<int:leave_id>/review', methods=['PUT'])
@token_required
@roles_required('admin', 'teacher')
def review_leave(leave_id):
    leave_request = LeaveRequest.query.get_or_404(leave_id)
    data = request.get_json() or {}
    status = (data.get('status') or '').strip().lower()
    review_note = (data.get('review_note') or '').strip()

    if status not in ('approved', 'rejected'):
        return jsonify({'error': 'status must be approved or rejected'}), 400
    if not review_note:
        return jsonify({'error': 'review_note is required'}), 400

    reviewer = User.query.get(request.current_user['sub'])
    if not reviewer:
        return jsonify({'error': 'User not found'}), 404

    leave_request.status = status
    leave_request.review_note = review_note
    leave_request.reviewed_at = datetime.utcnow()
    leave_request.reviewed_by_user_id = reviewer.id
    db.session.commit()
    return jsonify(leave_request.to_dict())

# ---------------------------------------------------------------------------
# Document routes
# ---------------------------------------------------------------------------


@app.route('/api/documents', methods=['POST'])
@token_required
@roles_required('admin', 'teacher')
def upload_document():
    uploaded_file = request.files.get('file')
    if not uploaded_file or not uploaded_file.filename:
        return jsonify({'error': 'file is required'}), 400
    if not allowed_document_file(uploaded_file.filename):
        return jsonify({'error': 'Unsupported file type'}), 400

    title = (request.form.get('title') or '').strip()
    doc_type = (request.form.get('doc_type') or '').strip().lower()
    description = (request.form.get('description') or '').strip()
    student_id = (request.form.get('student_id') or '').strip()

    if not title:
        return jsonify({'error': 'title is required'}), 400
    if doc_type not in ('attendance', 'admission', 'id', 'marksheet', 'certificate', 'other'):
        return jsonify({'error': 'Invalid doc_type'}), 400

    student = None
    if student_id:
        try:
            student = Student.query.get(int(student_id))
        except ValueError:
            return jsonify({'error': 'Invalid student_id'}), 400
        if not student:
            return jsonify({'error': 'Student not found'}), 404

    original_filename = secure_filename(uploaded_file.filename)
    file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    stored_filename = f"{uuid.uuid4().hex}.{file_ext}" if file_ext else uuid.uuid4().hex
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)
    uploaded_file.save(file_path)

    document = Document(
        student_id=student.id if student else None,
        title=title,
        description=description or None,
        doc_type=doc_type,
        original_filename=original_filename,
        stored_filename=stored_filename,
        mime_type=uploaded_file.mimetype,
        uploaded_by_user_id=request.current_user['sub'],
    )
    db.session.add(document)
    db.session.commit()
    return jsonify(document.to_dict()), 201


@app.route('/api/documents', methods=['GET'])
@token_required
@roles_required('admin', 'teacher')
def get_documents():
    student_id = request.args.get('student_id')
    doc_type = (request.args.get('doc_type') or '').strip().lower()
    query = Document.query

    if student_id:
        try:
            query = query.filter(Document.student_id == int(student_id))
        except ValueError:
            return jsonify({'error': 'Invalid student_id'}), 400
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)

    documents = query.order_by(Document.uploaded_at.desc()).all()
    return jsonify([doc.to_dict() for doc in documents])


@app.route('/api/documents/<int:document_id>/download', methods=['GET'])
@token_required
@roles_required('admin', 'teacher')
def download_document(document_id):
    document = Document.query.get_or_404(document_id)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], document.stored_filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    return send_from_directory(
        app.config['UPLOAD_FOLDER'],
        document.stored_filename,
        as_attachment=True,
        download_name=document.original_filename,
    )


@app.route('/api/documents/<int:document_id>', methods=['DELETE'])
@token_required
@roles_required('admin', 'teacher')
def delete_document(document_id):
    document = Document.query.get_or_404(document_id)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], document.stored_filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    db.session.delete(document)
    db.session.commit()
    return jsonify({'message': 'Document deleted'})

# ---------------------------------------------------------------------------
# Serve frontend
# ---------------------------------------------------------------------------


@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'login.html')


@app.route('/login.html')
def serve_login():
    return send_from_directory(FRONTEND_DIR, 'login.html')


@app.route('/index.html')
def serve_app():
    return send_from_directory(FRONTEND_DIR, 'index.html')

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------


def seed_data():
    """Create default admin user if none exists."""
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', role='admin')
        admin.set_password('admin123')
        db.session.add(admin)
    if not User.query.filter_by(username='teacher').first():
        teacher = User(username='teacher', role='teacher')
        teacher.set_password('teacher123')
        db.session.add(teacher)
    if not Student.query.filter_by(roll_number='STU001').first():
        student = Student(
            roll_number='STU001',
            name='Demo Student',
            department='Computer Science',
            year='1st Year',
            email='student@example.com',
        )
        db.session.add(student)
    if not User.query.filter_by(username='STU001').first():
        student_user = User(username='STU001', role='student')
        student_user.set_password('student123')
        db.session.add(student_user)

    # Ensure students that existed before auto-account flow can also log in.
    ensure_student_accounts()
    db.session.commit()


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_data()
    print('=> Server running at http://localhost:5000')
    app.run(debug=True, port=5000)
