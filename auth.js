/**
 * Auth Module — Login page logic
 */
(function () {
    const form = document.getElementById('loginForm');
    if (!form) return; // Only runs on login.html

    // Redirect if already logged in
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html';
        return;
    }

    const errorEl = document.getElementById('loginError');
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('passwordToggle');

    // Password visibility toggle
    toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    });

    // Login form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = passwordInput.value;

        errorEl.classList.remove('visible');

        if (!username || !password) {
            errorEl.textContent = 'Please enter both username and password.';
            errorEl.classList.add('visible');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';

        try {
            const data = await apiLogin(username, password);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.add('visible');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });
})();
