/**
 * Tickets Module — students track disputes, teachers/admin resolve them.
 */
const TicketsModule = {
    tickets: [],

    async render(container) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isStudent = user.role === 'student';

        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>${isStudent ? '🎫 My Tickets' : '🎫 Attendance Tickets'}</h2>
                </div>

                <div class="filter-bar">
                    <select class="form-control" id="ticketStatusFilter" style="min-width:180px;">
                        <option value="">All Status</option>
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <button class="btn btn-outline btn-sm" id="refreshTicketsBtn">Refresh</button>
                </div>

                <div class="table-container">
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Student</th>
                                    <th>Date</th>
                                    <th>Marked</th>
                                    <th>Issue</th>
                                    <th>Status</th>
                                    ${isStudent ? '' : '<th>Action</th>'}
                                </tr>
                            </thead>
                            <tbody id="ticketsBody">
                                <tr><td colspan="${isStudent ? 6 : 7}" class="loading"><div class="spinner"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('ticketStatusFilter').addEventListener('change', () => this.loadTickets());
        document.getElementById('refreshTicketsBtn').addEventListener('click', () => this.loadTickets());

        await this.loadTickets();
    },

    async loadTickets() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isStudent = user.role === 'student';
        const status = document.getElementById('ticketStatusFilter')?.value || '';

        try {
            this.tickets = await apiGetTickets(status ? { status } : {});
            this.renderTable(isStudent);
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    renderTable(isStudent) {
        const tbody = document.getElementById('ticketsBody');
        if (!tbody) return;

        if (!this.tickets.length) {
            tbody.innerHTML = `<tr><td colspan="${isStudent ? 6 : 7}">
                <div class="empty-state">
                    <div class="empty-icon">🎫</div>
                    <p>No tickets found.</p>
                </div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = this.tickets.map(t => {
            const dateLabel = t.attendance_date
                ? new Date(t.attendance_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : '-';
            const statusClass = t.status === 'resolved' ? 'status-present' : (t.status === 'rejected' ? 'status-absent' : 'status-warning');
            const resolver = t.resolved_by_username ? `<div style="font-size:0.75rem; color:var(--text-muted);">by ${this.esc(t.resolved_by_username)}</div>` : '';

            return `
                <tr>
                    <td>#${t.id}</td>
                    <td>${this.esc(t.student_name || '')} (${this.esc(t.roll_number || '')})</td>
                    <td>${dateLabel}</td>
                    <td><span class="status ${t.attendance_status === 'present' ? 'status-present' : 'status-absent'}">${this.esc(t.attendance_status || '-')}</span></td>
                    <td>
                        <div>${this.esc(t.message || '')}</div>
                        ${t.resolution_note ? `<div style="font-size:0.78rem; color:var(--text-secondary); margin-top:5px;">Resolution: ${this.esc(t.resolution_note)}</div>` : ''}
                    </td>
                    <td><span class="status ${statusClass}">${this.esc(t.status)}</span>${resolver}</td>
                    ${isStudent ? '' : `<td>${t.status === 'open' ? `<button class="btn btn-outline btn-sm" onclick="TicketsModule.openResolve(${t.id})">Resolve</button>` : '<span style="color:var(--text-muted);">Closed</span>'}</td>`}
                </tr>`;
        }).join('');
    },

    openResolve(ticketId) {
        openModal(`
            <div class="modal-header">
                <h3>Resolve Ticket #${ticketId}</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="ticketResolutionStatus">Decision *</label>
                    <select id="ticketResolutionStatus" class="form-control">
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="ticketResolutionNote">Resolution Note *</label>
                    <textarea id="ticketResolutionNote" class="form-control" rows="4" placeholder="Write what was checked and what action you took..."></textarea>
                </div>
                <div id="ticketResolutionError" class="form-error"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" id="ticketResolveBtn">Submit</button>
            </div>
        `);

        document.getElementById('ticketResolveBtn').addEventListener('click', async () => {
            const status = document.getElementById('ticketResolutionStatus').value;
            const note = document.getElementById('ticketResolutionNote').value.trim();
            const errorEl = document.getElementById('ticketResolutionError');

            if (!note) {
                errorEl.textContent = 'Please add a resolution note.';
                return;
            }

            try {
                await apiResolveTicket(ticketId, status, note);
                closeModal();
                showToast('Ticket updated.', 'success');
                await this.loadTickets();
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
