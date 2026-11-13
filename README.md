# 🎓 Student Attendance Management System

A full-stack student attendance management application with a Python Flask backend and vanilla HTML/CSS/JS frontend.

## Features

- **Authentication** — JWT-based login with admin and teacher roles
- **Student Management** — Full CRUD (add, edit, delete, search)
- **Attendance Marking** — Daily attendance with present/absent toggles
- **Attendance Records** — Historical records with date, month, and student filtering
- **Analytics** — Charts (bar, pie, line) and per-student breakdown table
- **Tickets** — Raise and resolve attendance-related issues
- **Leave Requests** — Apply and review leave applications
- **Documents** — Upload, list, download, and delete documents
- **Responsive** — Works on desktop, tablet, and mobile

## Frontend UI/UX Documentation

- Detailed specification: `frontend/FRONTEND_UIUX_DETAILED.md`

## Quick Start

### 1. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the server

```bash
python app.py
```

### 3. Open in browser

Navigate to **http://localhost:5000**

### Default Credentials

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Admin   | admin     | admin123    |
| Teacher | teacher   | teacher123  |

## Project Structure

```
VML PY/
├── backend/
│   ├── app.py              # Flask server + API routes
│   ├── models.py           # SQLAlchemy database models
│   ├── requirements.txt    # Python dependencies
│   └── attendance.db       # SQLite database (auto-created)
├── frontend/
│   ├── index.html          # Main SPA shell
│   ├── login.html          # Login page
│   ├── css/styles.css      # Design system
│   └── js/
│       ├── app.js          # Router + layout controller
│       ├── api.js          # API communication
│       ├── auth.js         # Login/logout
│       ├── dashboard.js    # Dashboard module
│       ├── students.js     # Student CRUD
│       ├── attendance.js   # Attendance marking
│       ├── records.js      # Historical records
│       ├── analytics.js    # Charts + analytics
│       ├── tickets.js      # Ticket workflows
│       ├── leaves.js       # Leave request workflows
│       └── documents.js    # Document management
└── README.md
```

## Tech Stack

- **Backend**: Python 3, Flask, SQLAlchemy, SQLite, PyJWT
- **Frontend**: Vanilla HTML/CSS/JS, Chart.js
- **Auth**: JWT tokens stored in localStorage
