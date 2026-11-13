/**
 * App Router & Layout Controller
 * Hash-based SPA routing with auth guard, sidebar management, and toast system.
 */

(function () {
    // --- Auth Guard ---
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elements ---
    const content = document.getElementById('content');
    const pageTitle = document.getElementById('pageTitle');
    const dateDisplay = document.getElementById('dateDisplay');
    const roleBadge = document.getElementById('roleBadge');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburger');
    const logoutBtn = document.getElementById('logoutBtn');
    const navItems = document.querySelectorAll('.nav-item[data-page]');

    // --- User Info ---
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || 'teacher';
    roleBadge.textContent = user.role || 'user';
    roleBadge.className = `badge badge-${role}`;

    const allowedPagesByRole = {
        admin: ['dashboard', 'students', 'attendance', 'records', 'analytics', 'tickets', 'leaves', 'documents'],
        teacher: ['dashboard', 'students', 'attendance', 'records', 'analytics', 'tickets', 'leaves', 'documents'],
        student: ['records', 'tickets', 'leaves'],
    };
    const allowedPages = allowedPagesByRole[role] || ['dashboard'];

    navItems.forEach(item => {
        const page = item.dataset.page;
        item.style.display = allowedPages.includes(page) ? '' : 'none';
    });

    // --- Date/Time ---
    function updateDateTime() {
        const now = new Date();
        dateDisplay.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        }) + '  ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    updateDateTime();
    setInterval(updateDateTime, 30000);

    // --- Page Titles ---
    const titles = {
        dashboard: '📊 Dashboard',
        students: '🎓 Students',
        attendance: '✅ Mark Attendance',
        records: '📑 Attendance Records',
        analytics: '📈 Analytics',
        tickets: '🎫 Tickets',
        leaves: '📝 Leave Requests',
        documents: '📂 Documents',
    };

    // --- Router ---
    let currentModule = null;

    async function navigate() {
        const defaultPage = allowedPages.includes('dashboard') ? 'dashboard' : allowedPages[0];
        const hash = (window.location.hash || `#${defaultPage}`).slice(1);
        const page = (titles[hash] && allowedPages.includes(hash)) ? hash : defaultPage;

        if (hash !== page) {
            window.location.hash = page;
            return;
        }

        // Update sidebar active state
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update title
        pageTitle.textContent = titles[page] || 'Dashboard';
        document.title = `${titles[page] || 'Dashboard'} — Attendance Manager`;

        // Destroy previous module charts
        if (currentModule && currentModule.destroy) currentModule.destroy();

        // Show loading
        content.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading…</span></div>';

        // Render module
        switch (page) {
            case 'dashboard':
                currentModule = DashboardModule;
                await DashboardModule.render(content);
                break;
            case 'students':
                currentModule = StudentsModule;
                await StudentsModule.render(content);
                break;
            case 'attendance':
                currentModule = AttendanceModule;
                await AttendanceModule.render(content);
                break;
            case 'records':
                currentModule = RecordsModule;
                await RecordsModule.render(content);
                break;
            case 'analytics':
                currentModule = AnalyticsModule;
                await AnalyticsModule.render(content);
                break;
            case 'tickets':
                currentModule = TicketsModule;
                await TicketsModule.render(content);
                break;
            case 'leaves':
                currentModule = LeavesModule;
                await LeavesModule.render(content);
                break;
            case 'documents':
                currentModule = DocumentsModule;
                await DocumentsModule.render(content);
                break;
        }

        // Close mobile sidebar
        closeSidebar();
    }

    window.addEventListener('hashchange', navigate);
    navigate();

    // --- Sidebar toggle (mobile) ---
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', closeSidebar);

    // --- Logout ---
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
})();

// ---------------------------------------------------------------------------
// Global Utilities
// ---------------------------------------------------------------------------

/** Show a toast notification */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

/** Open the global modal */
function openModal(html) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = html;
    overlay.classList.add('active');
}

/** Close the global modal */
function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
}
// --- Custom Glowing Cursor ---
const glowingCursor = document.createElement('div');
glowingCursor.classList.add('glowing-cursor');
document.body.appendChild(glowingCursor);

document.addEventListener('mousemove', (e) => {
    glowingCursor.style.left = e.clientX + 'px';
    glowingCursor.style.top = e.clientY + 'px';
});

document.addEventListener('mousedown', () => {
    glowingCursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
});

document.addEventListener('mouseup', () => {
    glowingCursor.style.transform = 'translate(-50%, -50%) scale(1)';
});
