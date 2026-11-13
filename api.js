/**
 * API Communication Module
 * Handles all backend API calls with JWT auth header injection.
 */
const API_BASE = (window.location.origin && window.location.origin !== 'null')
    ? `${window.location.origin}/api`
    : 'http://127.0.0.1:5000/api';
/**
 * Generic fetch wrapper with auth and error handling.
 */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (options.body && !isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const isLoginRequest = url === '/auth/login';

    try {
        const res = await fetch(API_BASE + url, { ...options, headers });
        
        // Check content-type before parsing as JSON
        const contentType = res.headers.get('content-type') || '';
        let data;
        
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const text = await res.text();
            // If response is HTML (error page), show a helpful error message
            if (text.startsWith('<')) {
                throw new Error('Server returned an error page. Is the backend server running?');
            }
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(`Invalid response: ${text.substring(0, 100)}`);
            }
        }
        
        if (!res.ok) {
            if (res.status === 401) {
                if (!isLoginRequest) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                }
                throw new Error(data.error || 'Invalid credentials');
            }
            throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data;
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            throw new Error('Network error — is the server running?');
        }
        throw err;
    }
}

/* --- Auth --- */
async function apiLogin(username, password) {
    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

async function apiGetMe() {
    return apiFetch('/auth/me');
}

/* --- Students --- */
async function apiGetStudents(query = '') {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiFetch(`/students${q}`);
}

async function apiAddStudent(data) {
    return apiFetch('/students', { method: 'POST', body: JSON.stringify(data) });
}

async function apiUpdateStudent(id, data) {
    return apiFetch(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function apiDeleteStudent(id) {
    return apiFetch(`/students/${id}`, { method: 'DELETE' });
}

/* --- Attendance --- */
async function apiMarkAttendance(dateStr, records) {
    return apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({ date: dateStr, records }),
    });
}

async function apiGetAttendance(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/attendance${qs ? '?' + qs : ''}`);
}

/* --- Analytics --- */
async function apiGetAnalytics() {
    return apiFetch('/analytics');
}

/* --- Tickets --- */
async function apiRaiseTicket(attendanceId, message) {
    return apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({ attendance_id: attendanceId, message }),
    });
}

async function apiGetTickets(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/tickets${qs ? '?' + qs : ''}`);
}

async function apiResolveTicket(ticketId, status, resolutionNote) {
    return apiFetch(`/tickets/${ticketId}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ status, resolution_note: resolutionNote }),
    });
}

/* --- Leaves --- */
async function apiApplyLeave(data) {
    return apiFetch('/leaves', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

async function apiGetLeaves(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/leaves${qs ? '?' + qs : ''}`);
}

async function apiReviewLeave(leaveId, status, reviewNote) {
    return apiFetch(`/leaves/${leaveId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ status, review_note: reviewNote }),
    });
}

/* --- Documents --- */
async function apiGetDocuments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/documents${qs ? '?' + qs : ''}`);
}

async function apiUploadDocument(formData) {
    return apiFetch('/documents', {
        method: 'POST',
        body: formData,
    });
}

async function apiDeleteDocument(documentId) {
    return apiFetch(`/documents/${documentId}`, { method: 'DELETE' });
}

async function apiDownloadDocument(documentId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/documents/${documentId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const filename = match ? decodeURIComponent(match[1] || match[2]) : `document-${documentId}`;
    return { blob, filename };
}
