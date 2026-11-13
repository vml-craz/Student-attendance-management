/**
 * Attendance Records Module — Historical records with filtering
 */
const RecordsModule = {
    ticketsByAttendanceId: {},

    async render(container) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isStudent = user.role === 'student';

        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>${isStudent ? '📑 My Attendance' : '📑 Attendance Records'}</h2>
                </div>

                <div class="filter-bar">
                    <input type="date" class="form-control" id="filterDate" placeholder="Filter by date">
                    <input type="month" class="form-control" id="filterMonth" placeholder="Filter by month">
                    <div class="search-bar" id="studentSearchWrap" style="flex:1; min-width:200px; ${isStudent ? 'display:none;' : ''}">
                        <span class="search-icon">🔍</span>
                        <input type="text" class="form-control" id="filterStudent"
                               placeholder="Search student name…" style="padding-left:38px;">
                    </div>
                    <button class="btn btn-outline btn-sm" id="clearFilters">Clear</button>
                </div>

                <div class="table-container">
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    ${isStudent ? '<th>Action</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="recordsBody">
                                <tr><td colspan="${isStudent ? 5 : 4}" class="loading"><div class="spinner"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('filterDate').addEventListener('change', () => this.loadRecords());
        document.getElementById('filterMonth').addEventListener('change', () => this.loadRecords());
        if (!isStudent) {
            document.getElementById('filterStudent').addEventListener('input', () => {
                clearTimeout(this._t);
                this._t = setTimeout(() => this.loadRecords(), 300);
            });
        }
        document.getElementById('clearFilters').addEventListener('click', () => {
            document.getElementById('filterDate').value = '';
            document.getElementById('filterMonth').value = '';
            const studentFilter = document.getElementById('filterStudent');
            if (studentFilter) studentFilter.value = '';
            this.loadRecords();
        });

        await this.loadRecords();
    },

    async loadRecords() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isStudent = user.role === 'student';

        const params = {};
        const dateVal = document.getElementById('filterDate')?.value;
        const monthVal = document.getElementById('filterMonth')?.value;
        const nameVal = document.getElementById('filterStudent')?.value?.trim();

        if (dateVal) params.date = dateVal;
        if (monthVal) params.month = monthVal;

        try {
            let records = await apiGetAttendance(params);

            if (isStudent) {
                const tickets = await apiGetTickets();
                this.ticketsByAttendanceId = {};
                tickets.forEach(t => {
                    if (t.attendance_id) this.ticketsByAttendanceId[t.attendance_id] = t;
                });
            } else {
                this.ticketsByAttendanceId = {};
            }

            // Client-side name filter
            if (!isStudent && nameVal) {
                const q = nameVal.toLowerCase();
                records = records.filter(r =>
                    (r.student_name && r.student_name.toLowerCase().includes(q)) ||
                    (r.roll_number && r.roll_number.toLowerCase().includes(q))
                );
            }

            this.renderTable(records, isStudent);
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    renderTable(records, isStudent) {
        const tbody = document.getElementById('recordsBody');
        if (!tbody) return;

        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${isStudent ? 5 : 4}">
                <div class="empty-state">
                    <div class="empty-icon">📑</div>
                    <p>No records found for the selected filters.</p>
                </div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = records.map(r => {
            const dateObj = new Date(r.date + 'T00:00:00');
            const dateStr = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const statusClass = r.status === 'present' ? 'status-present' : 'status-absent';
            const statusIcon = r.status === 'present' ? '✅' : '❌';
            const existingTicket = this.ticketsByAttendanceId[r.id];

            return `
                <tr>
                    <td><strong>${this.esc(r.roll_number || '')}</strong></td>
                    <td>${this.esc(r.student_name || '')}</td>
                    <td>${dateStr}</td>
                    <td><span class="status ${statusClass}">${statusIcon} ${r.status}</span></td>
                    ${isStudent ? `<td>${existingTicket ? `<span class="status status-warning">🎫 ${this.esc(existingTicket.status)}</span>` : `<button class="btn btn-outline btn-sm" onclick="RecordsModule.openRaiseTicket(${r.id})">Raise Ticket</button>`}</td>` : ''}
                </tr>`;
        }).join('');
    },

    openRaiseTicket(attendanceId) {
        openModal(`
            <div class="modal-header">
                <h3>Raise Attendance Ticket</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="ticketMessage">Issue Details *</label>
                    <textarea id="ticketMessage" class="form-control" rows="4" placeholder="Example: I was present in class on this date, but marked absent."></textarea>
                </div>
                <div id="ticketError" class="form-error"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" id="submitTicketBtn">Submit Ticket</button>
            </div>
        `);

        document.getElementById('submitTicketBtn').addEventListener('click', async () => {
            const message = document.getElementById('ticketMessage').value.trim();
            const errorEl = document.getElementById('ticketError');

            if (!message) {
                errorEl.textContent = 'Please explain the issue.';
                return;
            }

            try {
                await apiRaiseTicket(attendanceId, message);
                closeModal();
                showToast('Ticket raised successfully.', 'success');
                await this.loadRecords();
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
