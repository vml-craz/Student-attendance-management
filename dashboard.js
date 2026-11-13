/**
 * Dashboard Module
 */
const DashboardModule = {
    charts: {},

    async render(container) {
        container.innerHTML = `
            <div class="fade-in">
                <div class="toolbar">
                    <h2>📊 Dashboard</h2>
                    <span style="color:var(--text-muted); font-size:0.85rem;" id="dashDate"></span>
                </div>

                <div class="cards-grid" id="statCards">
                    <div class="card stat-card stat-primary">
                        <div class="stat-icon">🎓</div>
                        <div class="stat-value" id="statTotal">—</div>
                        <div class="stat-label">Total Students</div>
                    </div>
                    <div class="card stat-card stat-success">
                        <div class="stat-icon">✅</div>
                        <div class="stat-value" id="statPresent">—</div>
                        <div class="stat-label">Present Today</div>
                    </div>
                    <div class="card stat-card stat-danger">
                        <div class="stat-icon">❌</div>
                        <div class="stat-value" id="statAbsent">—</div>
                        <div class="stat-label">Absent Today</div>
                    </div>
                    <div class="card stat-card stat-warning">
                        <div class="stat-icon">📈</div>
                        <div class="stat-value" id="statPct">—</div>
                        <div class="stat-label">Overall Attendance</div>
                    </div>
                </div>

                <div class="chart-grid">
                    <div class="chart-card">
                        <h3>Today's Attendance</h3>
                        <div class="chart-canvas-wrap">
                            <canvas id="pieChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3>Attendance by Student</h3>
                        <div class="chart-canvas-wrap">
                            <canvas id="barChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        await this.loadData();
    },

    async loadData() {
        try {
            const data = await apiGetAnalytics();
            if (!data || !Array.isArray(data.per_student)) {
                throw new Error('Invalid analytics response from server');
            }

            document.getElementById('statTotal').textContent = data.total_students ?? '—';
            document.getElementById('statPresent').textContent = data.present_today ?? '—';
            document.getElementById('statAbsent').textContent = data.absent_today ?? '—';
            document.getElementById('statPct').textContent = typeof data.overall_percentage === 'number'
                ? `${data.overall_percentage}%`
                : '—';

            this.renderPieChart(data.present_today || 0, data.absent_today || 0);
            this.renderBarChart(data.per_student);
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    renderPieChart(present, absent) {
        if (this.charts.pie) this.charts.pie.destroy();
        const ctx = document.getElementById('pieChart');
        if (!ctx) return;

        const total = present + absent;
        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                    data: total > 0 ? [present, absent] : [1],
                    backgroundColor: total > 0 ? ['#22c55e', '#ef4444'] : ['#2e3348'],
                    borderWidth: 0,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter' }, padding: 16 } }
                }
            }
        });
    },

    renderBarChart(students) {
        if (this.charts.bar) this.charts.bar.destroy();
        const ctx = document.getElementById('barChart');
        if (!ctx) return;

        this.charts.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: students.map(s => s.name.split(' ')[0]),
                datasets: [{
                    label: 'Attendance %',
                    data: students.map(s => s.percentage),
                    backgroundColor: students.map(s =>
                        s.percentage >= 75 ? 'rgba(34, 197, 94, 0.7)' :
                            s.percentage >= 50 ? 'rgba(245, 158, 11, 0.7)' :
                                'rgba(239, 68, 68, 0.7)'
                    ),
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: '#2e3348' }, ticks: { color: '#94a3b8', font: { family: 'Inter' } } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter' } } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    destroy() {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
    }
};
