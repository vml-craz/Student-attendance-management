/**
 * Documents Module — upload and manage student attendance-related files.
 */
const DocumentsModule = {
    documents: [],
    students: [],

    async render(container) {
        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>📂 Documents</h2>
                </div>

                <div class="card" style="margin-bottom:20px;">
                    <h3 style="margin-bottom:14px;">Upload Document</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="docStudent">Student</label>
                            <select id="docStudent" class="form-control">
                                <option value="">General / No student</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="docType">Document Type *</label>
                            <select id="docType" class="form-control">
                                <option value="attendance">Attendance Proof</option>
                                <option value="admission">Admission</option>
                                <option value="id">ID</option>
                                <option value="marksheet">Marksheet</option>
                                <option value="certificate">Certificate</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="docTitle">Title *</label>
                            <input type="text" id="docTitle" class="form-control" placeholder="e.g. Attendance proof for seminar">
                        </div>
                        <div class="form-group">
                            <label for="docFile">File *</label>
                            <input type="file" id="docFile" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="docDescription">Description</label>
                        <textarea id="docDescription" class="form-control" rows="3" placeholder="Optional notes about the file..."></textarea>
                    </div>
                    <div id="docUploadError" class="form-error"></div>
                    <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
                        <button class="btn btn-outline btn-sm" id="refreshDocsTopBtn">Refresh</button>
                        <button class="btn btn-primary" id="uploadDocBtn">Upload Document</button>
                    </div>
                </div>

                <div class="filter-bar">
                    <select class="form-control" id="docStudentFilter" style="min-width:220px;">
                        <option value="">All Students</option>
                    </select>
                    <select class="form-control" id="docTypeFilter" style="min-width:180px;">
                        <option value="">All Types</option>
                        <option value="attendance">Attendance Proof</option>
                        <option value="admission">Admission</option>
                        <option value="id">ID</option>
                        <option value="marksheet">Marksheet</option>
                        <option value="certificate">Certificate</option>
                        <option value="other">Other</option>
                    </select>
                    <button class="btn btn-outline btn-sm" id="refreshDocsBtn">Refresh List</button>
                </div>

                <div class="table-container">
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Student</th>
                                    <th>Type</th>
                                    <th>Title</th>
                                    <th>File</th>
                                    <th>Uploaded By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="docsBody">
                                <tr><td colspan="7" class="loading"><div class="spinner"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        await this.loadStudents();
        await this.loadDocuments();

        document.getElementById('uploadDocBtn').addEventListener('click', () => this.uploadDocument());
        document.getElementById('refreshDocsBtn').addEventListener('click', () => this.loadDocuments());
        document.getElementById('refreshDocsTopBtn').addEventListener('click', () => this.loadDocuments());
        document.getElementById('docStudentFilter').addEventListener('change', () => this.loadDocuments());
        document.getElementById('docTypeFilter').addEventListener('change', () => this.loadDocuments());
    },

    async loadStudents() {
        try {
            this.students = await apiGetStudents();
            const studentSelect = document.getElementById('docStudent');
            const filterSelect = document.getElementById('docStudentFilter');
            if (!studentSelect || !filterSelect) return;

            this.students.forEach(student => {
                const option1 = document.createElement('option');
                option1.value = student.id;
                option1.textContent = `${student.name} (${student.roll_number})`;
                studentSelect.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = student.id;
                option2.textContent = `${student.name} (${student.roll_number})`;
                filterSelect.appendChild(option2);
            });
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async uploadDocument() {
        const errorEl = document.getElementById('docUploadError');
        errorEl.textContent = '';

        const title = document.getElementById('docTitle').value.trim();
        const docType = document.getElementById('docType').value;
        const description = document.getElementById('docDescription').value.trim();
        const studentId = document.getElementById('docStudent').value;
        const fileInput = document.getElementById('docFile');
        const file = fileInput.files[0];

        if (!title || !docType || !file) {
            errorEl.textContent = 'Please provide title, type, and a file.';
            return;
        }

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('doc_type', docType);
            formData.append('description', description);
            formData.append('student_id', studentId);
            formData.append('file', file);

            await apiUploadDocument(formData);
            showToast('Document uploaded successfully.', 'success');
            document.getElementById('docTitle').value = '';
            document.getElementById('docDescription').value = '';
            fileInput.value = '';
            document.getElementById('docStudent').value = '';
            await this.loadDocuments();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    },

    async loadDocuments() {
        const studentId = document.getElementById('docStudentFilter')?.value || '';
        const docType = document.getElementById('docTypeFilter')?.value || '';

        const params = {};
        if (studentId) params.student_id = studentId;
        if (docType) params.doc_type = docType;

        try {
            this.documents = await apiGetDocuments(params);
            this.renderTable();
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    renderTable() {
        const tbody = document.getElementById('docsBody');
        if (!tbody) return;

        if (!this.documents.length) {
            tbody.innerHTML = `<tr><td colspan="7">
                <div class="empty-state">
                    <div class="empty-icon">📂</div>
                    <p>No documents found.</p>
                </div>
            </td></tr>`;
            return;
        }

        const typeLabels = {
            attendance: 'Attendance Proof',
            admission: 'Admission',
            id: 'ID',
            marksheet: 'Marksheet',
            certificate: 'Certificate',
            other: 'Other',
        };

        tbody.innerHTML = this.documents.map(doc => `
            <tr>
                <td>#${doc.id}</td>
                <td>${this.esc(doc.student_name || 'General')}</td>
                <td><span class="status status-warning">${typeLabels[doc.doc_type] || doc.doc_type}</span></td>
                <td>
                    <div style="font-weight:600;">${this.esc(doc.title || '')}</div>
                    ${doc.description ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">${this.esc(doc.description)}</div>` : ''}
                </td>
                <td>${this.esc(doc.original_filename || '')}</td>
                <td>
                    <div>${this.esc(doc.uploaded_by_username || '')}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${this.formatDate(doc.uploaded_at)}</div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-outline btn-sm" onclick="DocumentsModule.downloadDocument(${doc.id})">Download</button>
                        <button class="btn btn-danger btn-sm" onclick="DocumentsModule.deleteDocument(${doc.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    async downloadDocument(documentId) {
        try {
            const result = await apiDownloadDocument(documentId);
            const url = URL.createObjectURL(result.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async deleteDocument(documentId) {
        openModal(`
            <div class="modal-header">
                <h3>Delete Document</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body" style="text-align:center;">
                <div style="font-size:2.4rem; margin-bottom:12px;">⚠️</div>
                <p style="color:var(--text-secondary);">This document will be permanently removed.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-danger" id="confirmDeleteDocBtn">Delete</button>
            </div>
        `);

        document.getElementById('confirmDeleteDocBtn').addEventListener('click', async () => {
            try {
                await apiDeleteDocument(documentId);
                closeModal();
                showToast('Document deleted.', 'success');
                await this.loadDocuments();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    },

    formatDate(value) {
        if (!value) return '';
        return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    },

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
