/**
 * Leaves Module — students apply OD/leave/emergency, teacher/admin review.
 */
const LeavesModule = {
    leaves: [],

    async render(container) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isStudent = user.role === 'student';

        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>${isStudent ? '📝 Apply Leave / OD' : '📝 Leave Requests'}</h2>
                </div>

                ${isStudent ? this.studentFormHtml() : ''}

                <div class="filter-bar">
                    <select class="form-control" id="leaveTypeFilter" style="min-width:180px;">
                        <option value="">All Types</option>
                        <option value="leave">Leave</option>
                        <option value="od">OD</option>
                        <option value="emergency">Emergency</option>
                    </select>
                    <select class="form-control" id="leaveStatusFilter" style="min-width:180px;">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <button class="btn btn-outline btn-sm" id="refreshLeavesBtn">Refresh</button>
                </div>

                <div class="table-container">
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Student</th>
                                    <th>Type</th>
                                    <th>Date Range</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    ${isStudent ? '' : '<th>Action</th>'}
                                </tr>
                            </thead>
                            <tbody id="leaveBody">
                                <tr><td colspan="${isStudent ? 6 : 7}" class="loading"><div class="spinner"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('leaveTypeFilter').addEventListener('change', () => this.loadLeaves());
        document.getElementById('leaveStatusFilter').addEventListener('change', () => this.loadLeaves());
        document.getElementById('refreshLeavesBtn').addEventListener('click', () => this.loadLeaves());

        if (isStudent) {
            document.getElementById('leaveType').addEventListener('change', (e) => {
                const type = e.target.value;
                if (type === 'emergency') {
                    const today = new Date().toISOString().split('T')[0];
                    document.getElementById('leaveStartDate').value = today;
                    document.getElementById('leaveEndDate').value = today;
                }
            });

            document.getElementById('applyLeaveBtn').addEventListener('click', () => this.submitLeave());
        }

        await this.loadLeaves();
    },

    studentFormHtml() {
        const today = new Date().toISOString().split('T')[0];
        return `
            <div class="card" style="margin-bottom:20px;">
                <h3 style="margin-bottom:14px;">Apply New Request</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="leaveType">Request Type *</label>
                        <select id="leaveType" class="form-control">
                            <option value="leave">Leave</option>
                            <option value="od">OD</option>
                            <option value="emergency">Emergency Leave</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="leaveStartDate">Start Date *</label>
                        <input type="date" id="leaveStartDate" class="form-control" value="${today}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="leaveEndDate">End Date *</label>
                        <input type="date" id="leaveEndDate" class="form-control" value="${today}">
                    </div>
                    <div class="form-group">
                        <label>&nbsp;</label>
                        <button class="btn btn-primary" id="applyLeaveBtn" style="width:100%; justify-content:center;">Submit Request</button>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label for="leaveReason">Reason *</label>
                    <textarea id="leaveReason" class="form-control" rows="3" placeholder="Explain your leave/OD/emergency request..."></textarea>
                </div>
                <div id="leaveApplyError" class="form-error" style="margin-top:10px;"></div>
            </div>
        `;
    },

    async submitLeave() {
        const type = document.getElementById('leaveType').value;
        const startDate = document.getElementById('leaveStartDate').value;
        const endDate = document.getElementById('leaveEndDate').value;
        const reason = document.getElementById('leaveReason').value.trim();
        const errorEl = document.getElementById('leaveApplyError');

        errorEl.textContent = '';

        if (!type || !startDate || !endDate || !reason) {
            errorEl.textContent = 'Please fill all required fields.';
            return;
        }

        try {
            await apiApplyLeave({
                request_type: type,
                start_date: startDate,
                end_date: endDate,
                reason,
            });
            showToast('Leave request submitted.', 'success');
            document.getElementById('leaveReason').value = '';
            await this.loadLeaves();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    },

    async loadLeaves() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isStudent = user.role === 'student';
        const status = document.getElementById('leaveStatusFilter')?.value || '';
        const requestType = document.getElementById('leaveTypeFilter')?.value || '';

        const params = {};
        if (status) params.status = status;
        if (requestType) params.request_type = requestType;

        try {
            this.leaves = await apiGetLeaves(params);
            this.renderTable(isStudent);
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    renderTable(isStudent) {
        const tbody = document.getElementById('leaveBody');
        if (!tbody) return;

        if (!this.leaves.length) {
            tbody.innerHTML = `<tr><td colspan="${isStudent ? 6 : 7}">
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>No leave requests found.</p>
                </div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = this.leaves.map(l => {
            const startDate = l.start_date ? new Date(l.start_date + 'T00:00:00') : null;
            const endDate = l.end_date ? new Date(l.end_date + 'T00:00:00') : null;
            const dateLabel = startDate && endDate
                ? `${startDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : '-';
            const typeMap = { leave: 'Leave', od: 'OD', emergency: 'Emergency' };
            const statusClass = l.status === 'approved' ? 'status-present' : (l.status === 'rejected' ? 'status-absent' : 'status-warning');

            return `
                <tr>
                    <td>#${l.id}</td>
                    <td>${this.esc(l.student_name || '')} (${this.esc(l.roll_number || '')})</td>
                    <td><span class="status status-warning">${typeMap[l.request_type] || l.request_type}</span></td>
                    <td>${dateLabel}</td>
                    <td>
                        <div>${this.esc(l.reason || '')}</div>
                        ${l.review_note ? `<div style="font-size:0.78rem; color:var(--text-secondary); margin-top:5px;">Review: ${this.esc(l.review_note)}</div>` : ''}
                    </td>
                    <td>
                        <span class="status ${statusClass}">${this.esc(l.status || '')}</span>
                        ${l.reviewed_by_username ? `<div style="font-size:0.75rem; color:var(--text-muted);">by ${this.esc(l.reviewed_by_username)}</div>` : ''}
                    </td>
                    ${isStudent ? '' : `<td>${l.status === 'pending' ? `<button class="btn btn-outline btn-sm" onclick="LeavesModule.openReview(${l.id})">Review</button>` : '<span style="color:var(--text-muted);">Closed</span>'}</td>`}
                </tr>
            `;
        }).join('');
    },

    openReview(leaveId) {
        openModal(`
            <div class="modal-header">
                <h3>Review Leave #${leaveId}</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="leaveReviewStatus">Decision *</label>
                    <select id="leaveReviewStatus" class="form-control">
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="leaveReviewNote">Review Note *</label>
                    <textarea id="leaveReviewNote" class="form-control" rows="4" placeholder="Add a short reason for your decision..."></textarea>
                </div>
                <div id="leaveReviewError" class="form-error"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" id="submitLeaveReviewBtn">Submit</button>
            </div>
        `);

        document.getElementById('submitLeaveReviewBtn').addEventListener('click', async () => {
            const status = document.getElementById('leaveReviewStatus').value;
            const note = document.getElementById('leaveReviewNote').value.trim();
            const errorEl = document.getElementById('leaveReviewError');

            if (!note) {
                errorEl.textContent = 'Please add review note.';
                return;
            }

            try {
                await apiReviewLeave(leaveId, status, note);
                closeModal();
                showToast('Leave request updated.', 'success');
                await this.loadLeaves();
            } catch (err) {
                errorEl.textContent = err.message;
            }
        });
    },

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
