/**
 * Students Module — Full CRUD with search, modal forms, and validation
 */
const StudentsModule = {
    students: [],

    async render(container) {
        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>🎓 Students</h2>
                    <button class="btn btn-primary" id="addStudentBtn">➕ Add Student</button>
                </div>

                <div class="table-container">
                    <div class="table-header">
                        <h3>All Students</h3>
                        <div class="search-bar">
                            <span class="search-icon">🔍</span>
                            <input type="text" class="form-control" id="studentSearch"
                                   placeholder="Search by name or roll number…"
                                   style="padding-left:38px; min-width:260px;">
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Year</th>
                                    <th>Email</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="studentTableBody">
                                <tr><td colspan="6" class="loading"><div class="spinner"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('addStudentBtn').addEventListener('click', () => this.openForm());
        document.getElementById('studentSearch').addEventListener('input', (e) => this.search(e.target.value));

        await this.loadStudents();
    },

    async loadStudents(query = '') {
        try {
            this.students = await apiGetStudents(query);
            this.renderTable();
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    renderTable() {
        const tbody = document.getElementById('studentTableBody');
        if (!tbody) return;

        if (this.students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">
                <div class="empty-state">
                    <div class="empty-icon">🎓</div>
                    <p>No students found. Add your first student!</p>
                </div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = this.students.map(s => `
            <tr>
                <td><strong>${this.esc(s.roll_number)}</strong></td>
                <td>${this.esc(s.name)}</td>
                <td>${this.esc(s.department)}</td>
                <td>${this.esc(s.year)}</td>
                <td>${this.esc(s.email)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-outline btn-sm" onclick="StudentsModule.openForm(${s.id})">✏️ Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="StudentsModule.confirmDelete(${s.id}, '${this.esc(s.name)}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    openForm(editId = null) {
        const student = editId ? this.students.find(s => s.id === editId) : null;
        const title = student ? 'Edit Student' : 'Add Student';

        openModal(`
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div id="formError" class="form-error" style="margin-bottom:12px;"></div>
                <form id="studentForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fRoll">Roll Number *</label>
                            <input type="text" id="fRoll" class="form-control" placeholder="e.g. CS001"
                                   value="${student ? student.roll_number : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="fName">Full Name *</label>
                            <input type="text" id="fName" class="form-control" placeholder="e.g. John Doe"
                                   value="${student ? student.name : ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fDept">Department *</label>
                            <input type="text" id="fDept" class="form-control" placeholder="e.g. Computer Science"
                                   value="${student ? student.department : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="fYear">Year / Class *</label>
                            <input type="text" id="fYear" class="form-control" placeholder="e.g. 3rd Year"
                                   value="${student ? student.year : ''}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="fEmail">Email *</label>
                        <input type="email" id="fEmail" class="form-control" placeholder="e.g. john@example.com"
                               value="${student ? student.email : ''}" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" id="saveStudentBtn">${student ? 'Update' : 'Add Student'}</button>
            </div>
        `);

        document.getElementById('saveStudentBtn').addEventListener('click', () => this.saveStudent(editId));
    },

    async saveStudent(editId) {
        const errorEl = document.getElementById('formError');
        const data = {
            roll_number: document.getElementById('fRoll').value.trim(),
            name: document.getElementById('fName').value.trim(),
            department: document.getElementById('fDept').value.trim(),
            year: document.getElementById('fYear').value.trim(),
            email: document.getElementById('fEmail').value.trim(),
        };

        // Validate
        for (const [key, val] of Object.entries(data)) {
            if (!val) {
                errorEl.textContent = `${key.replace('_', ' ')} is required.`;
                return;
            }
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errorEl.textContent = 'Please enter a valid email address.';
            return;
        }

        try {
            if (editId) {
                await apiUpdateStudent(editId, data);
                showToast('Student updated successfully!', 'success');
            } else {
                const result = await apiAddStudent(data);
                const account = result?.student_account;
                if (account?.username && account?.password) {
                    showToast(`Student added. Login: ${account.username} / ${account.password}`, 'success');
                } else {
                    showToast('Student added successfully!', 'success');
                }
            }
            closeModal();
            await this.loadStudents();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    },

    confirmDelete(id, name) {
        openModal(`
            <div class="modal-header">
                <h3>Confirm Deletion</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body" style="text-align:center;">
                <div style="font-size:2.4rem; margin-bottom:12px;">⚠️</div>
                <p style="color:var(--text-secondary); margin-bottom:8px;">
                    Are you sure you want to delete <strong>${name}</strong>?
                </p>
                <p style="color:var(--text-muted); font-size:0.82rem;">
                    This will also remove all their attendance records.
                </p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
            </div>
        `);

        document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
            try {
                await apiDeleteStudent(id);
                showToast('Student deleted.', 'success');
                closeModal();
                await this.loadStudents();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    },

    search(query) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => this.loadStudents(query), 300);
    },

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
