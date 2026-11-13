/**
 * Attendance Marking Module
 */
const AttendanceModule = {
    students: [],
    records: {},   // student_id → status

    async render(container) {
        const today = new Date().toISOString().split('T')[0];

        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>✅ Mark Attendance</h2>
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <input type="date" class="form-control" id="attDate" value="${today}" style="width:auto;">
                        <button class="btn btn-outline btn-sm" id="markAllPresent">✅ Mark All Present</button>
                        <button class="btn btn-primary" id="submitAttendance">💾 Submit Attendance</button>
                    </div>
                </div>

                <div id="attList">
                    <div class="loading"><div class="spinner"></div><span>Loading students…</span></div>
                </div>
            </div>
        `;

        document.getElementById('markAllPresent').addEventListener('click', () => this.markAll('present'));
        document.getElementById('submitAttendance').addEventListener('click', () => this.submit());
        document.getElementById('attDate').addEventListener('change', () => this.loadExisting());

        await this.loadStudents();
        await this.loadExisting();
    },

    async loadStudents() {
        try {
            this.students = await apiGetStudents();
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async loadExisting() {
        const dateStr = document.getElementById('attDate').value;
        this.records = {};

        try {
            const existing = await apiGetAttendance({ date: dateStr });
            existing.forEach(r => { this.records[r.student_id] = r.status; });
        } catch (_) { /* no records yet */ }

        this.renderList();
    },

    renderList() {
        const listEl = document.getElementById('attList');
        if (!listEl) return;

        if (this.students.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎓</div>
                    <p>No students found. Add students first.</p>
                </div>`;
            return;
        }

        listEl.innerHTML = `<div class="attendance-grid">` +
            this.students.map(s => {
                const st = this.records[s.id] || '';
                return `
                <div class="attendance-row">
                    <div class="student-info">
                        <div class="name">${s.name}</div>
                        <div class="roll">${s.roll_number} · ${s.department}</div>
                    </div>
                    <div class="toggle-group">
                        <button class="toggle-btn present ${st === 'present' ? 'selected' : ''}"
                                onclick="AttendanceModule.toggle(${s.id}, 'present')">
                            ✅ Present
                        </button>
                        <button class="toggle-btn absent ${st === 'absent' ? 'selected' : ''}"
                                onclick="AttendanceModule.toggle(${s.id}, 'absent')">
                            ❌ Absent
                        </button>
                    </div>
                </div>`;
            }).join('') +
            `</div>`;
    },

    toggle(studentId, status) {
        this.records[studentId] = status;
        this.renderList();
    },

    markAll(status) {
        this.students.forEach(s => { this.records[s.id] = status; });
        this.renderList();
        showToast(`All students marked as ${status}.`, 'info');
    },

    async submit() {
        const dateStr = document.getElementById('attDate').value;
        if (!dateStr) {
            showToast('Please select a date.', 'warning');
            return;
        }

        // Ensure all students have a status
        const unmarked = this.students.filter(s => !this.records[s.id]);
        if (unmarked.length > 0) {
            showToast(`${unmarked.length} student(s) have no status. Please mark all students.`, 'warning');
            return;
        }

        const records = this.students.map(s => ({
            student_id: s.id,
            status: this.records[s.id],
        }));

        try {
            await apiMarkAttendance(dateStr, records);
            showToast('Attendance submitted successfully!', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
};
