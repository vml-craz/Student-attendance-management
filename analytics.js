/**
 * Analytics Module — Charts and visual insights
 */
const AnalyticsModule = {
    charts: {},

    async render(container) {
        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>📈 Analytics</h2>
                </div>

                <div class="chart-grid">
                    <div class="chart-card">
                        <h3>📊 Attendance Percentage by Student</h3>
                        <div class="chart-canvas-wrap">
                            <canvas id="analyticsBar"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3>🥧 Overall Present vs Absent</h3>
                        <div class="chart-canvas-wrap">
                            <canvas id="analyticsPie"></canvas>
                        </div>
                    </div>
                </div>

                <div class="chart-grid" style="margin-top:0;">
                    <div class="chart-card" style="grid-column: 1 / -1;">
                        <h3>📉 Attendance Trend (Last 30 Days)</h3>
                        <div class="chart-canvas-wrap" style="min-height:300px;">
                            <canvas id="analyticsLine"></canvas>
                        </div>
                    </div>
                </div>

                <div class="table-container" style="margin-top:20px;">
                    <div class="table-header">
                        <h3>Per-Student Breakdown</h3>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th>Total Classes</th>
                                    <th>Present</th>
                                    <th>Absent</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody id="analyticsBody">
                                <tr><td colspan="6" class="loading"><div class="spinner"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    async loadData() {
        try {
            const data = await apiGetAnalytics();
            if (!data || !Array.isArray(data.per_student)) {
                throw new Error('Invalid analytics response from server');
            }

            this.renderBarChart(data.per_student);
            this.renderPieChart(data.per_student);
            this.renderLineChart(Array.isArray(data.trends) ? data.trends : []);
            this.renderTable(data.per_student);
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    renderBarChart(students) {
        if (this.charts.bar) this.charts.bar.destroy();
        const ctx = document.getElementById('analyticsBar');
        if (!ctx) return;

        this.charts.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: students.map(s => s.name),
                datasets: [{
                    label: 'Attendance %',
                    data: students.map(s => s.percentage),
                    backgroundColor: students.map(s =>
                        s.percentage >= 75 ? 'rgba(34, 197, 94, 0.75)' :
                            s.percentage >= 50 ? 'rgba(245, 158, 11, 0.75)' :
                                'rgba(239, 68, 68, 0.75)'
                    ),
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true, max: 100, grid: { color: '#2e3348' }, ticks: { color: '#94a3b8', font: { family: 'Inter' } } },
                    y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    renderPieChart(students) {
        if (this.charts.pie) this.charts.pie.destroy();
        const ctx = document.getElementById('analyticsPie');
        if (!ctx) return;

        const totalPresent = students.reduce((a, s) => a + s.present, 0);
        const totalAbsent = students.reduce((a, s) => a + s.absent, 0);
        const total = totalPresent + totalAbsent;

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                    data: total > 0 ? [totalPresent, totalAbsent] : [1],
                    backgroundColor: total > 0 ? ['#22c55e', '#ef4444'] : ['#2e3348'],
                    borderWidth: 0,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter' }, padding: 16 } }
                }
            }
        });
    },

    renderLineChart(trends) {
        if (this.charts.line) this.charts.line.destroy();
        const ctx = document.getElementById('analyticsLine');
        if (!ctx) return;

        this.charts.line = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.map(t => {
                    const d = new Date(t.date + 'T00:00:00');
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [
                    {
                        label: 'Present',
                        data: trends.map(t => t.present),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                    },
                    {
                        label: 'Absent',
                        data: trends.map(t => t.absent),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#2e3348' }, ticks: { color: '#94a3b8', stepSize: 1, font: { family: 'Inter' } } },
                    x: { grid: { color: '#2e334822' }, ticks: { color: '#94a3b8', font: { family: 'Inter' } } }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter' }, padding: 16 } }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    },

    renderTable(students) {
        const tbody = document.getElementById('analyticsBody');
        if (!tbody) return;

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">
                <div class="empty-state"><div class="empty-icon">📈</div><p>No data yet.</p></div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = students.map(s => {
            const pctClass = s.percentage >= 75 ? 'pct-high' : s.percentage >= 50 ? 'pct-mid' : 'pct-low';
            const statusClass = s.percentage < 50 ? 'status-warning' : '';

            return `
                <tr>
                    <td><strong>${s.roll_number}</strong></td>
                    <td>${s.name}</td>
                    <td>${s.total_classes}</td>
                    <td><span class="status status-present">${s.present}</span></td>
                    <td><span class="status status-absent">${s.absent}</span></td>
                    <td>
                        <span class="${pctClass}">
                            <span class="pct-bar"><span class="pct-bar-fill" style="width:${s.percentage}%"></span></span>
                            <strong>${s.percentage}%</strong>
                        </span>
                        ${s.percentage < 50 ? ' <span class="status status-warning">⚠️ Low</span>' : ''}
                    </td>
                </tr>`;
        }).join('');
    },

    destroy() {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
    }
};
