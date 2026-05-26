// ============================================================
// Lesson Note — Auth Manager (Supabase Email + Password)
// ============================================================

window.AuthManager = {
  currentUser: null,
  session: null,

  // ─── Khởi tạo Auth ───────────────────────────────────────
  async init() {
    // Khôi phục session từ localStorage (Supabase tự lưu)
    const storedSession = this._getStoredSession();
    if (storedSession) {
      // Kiểm tra session còn hạn không
      const expiresAt = storedSession.expires_at * 1000;
      if (Date.now() < expiresAt) {
        this.session = storedSession;
        this.currentUser = storedSession.user;
        return true; // Đã đăng nhập
      } else {
        // Session hết hạn → thử refresh
        const refreshed = await this._refreshSession(storedSession.refresh_token);
        if (refreshed) return true;
        this._clearSession();
      }
    }
    return false; // Chưa đăng nhập
  },

  // ─── Đăng ký ─────────────────────────────────────────────
  async signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.msg || data.message || 'Đăng ký thất bại');
    }

    // Nếu cần xác nhận email
    if (data.id && !data.access_token) {
      return { needsConfirmation: true };
    }

    if (data.access_token) {
      this._storeSession(data);
      this.session = data;
      this.currentUser = data.user;
      return { success: true };
    }

    return { needsConfirmation: true };
  },

  // ─── Đăng nhập ───────────────────────────────────────────
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error_description || data.msg || 'Đăng nhập thất bại');
    }

    this._storeSession(data);
    this.session = data;
    this.currentUser = data.user;
    return true;
  },

  // ─── Đăng xuất ───────────────────────────────────────────
  async signOut() {
    if (this.session?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${this.session.access_token}`
        }
      }).catch(() => {}); // Ignore errors on logout
    }
    this._clearSession();
    this.session = null;
    this.currentUser = null;
  },

  // ─── Lấy Access Token (tự động refresh nếu hết hạn) ─────
  async getAccessToken() {
    if (!this.session) return null;

    const expiresAt = this.session.expires_at * 1000;
    // Refresh nếu còn < 5 phút
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const refreshed = await this._refreshSession(this.session.refresh_token);
      if (!refreshed) {
        // Session hết hạn, cần đăng nhập lại
        this._clearSession();
        window.location.reload();
        return null;
      }
    }

    return this.session.access_token;
  },

  // ─── Quên mật khẩu ───────────────────────────────────────
  async resetPassword(email) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.msg || 'Không thể gửi email reset');
    }
  },

  // ─── Refresh Session ─────────────────────────────────────
  async _refreshSession(refreshToken) {
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!res.ok) return false;

      const data = await res.json();
      this._storeSession(data);
      this.session = data;
      this.currentUser = data.user;
      return true;
    } catch {
      return false;
    }
  },

  // ─── Lưu / Lấy / Xóa session ─────────────────────────────
  _storeSession(sessionData) {
    localStorage.setItem('lesson_note_session', JSON.stringify(sessionData));
  },

  _getStoredSession() {
    try {
      const str = localStorage.getItem('lesson_note_session');
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  },

  _clearSession() {
    localStorage.removeItem('lesson_note_session');
  },

  // ─── Render màn hình Auth ─────────────────────────────────
  renderAuthScreen() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.classList.add('active');
    this._switchAuthTab('login');
  },

  hideAuthScreen() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  _switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const resetForm = document.getElementById('auth-reset-form');
    const tabs = document.querySelectorAll('.auth-tab');

    // Hide all
    [loginForm, registerForm, resetForm].forEach(f => f && f.classList.add('hidden'));
    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
      loginForm?.classList.remove('hidden');
      document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');
    } else if (tab === 'register') {
      registerForm?.classList.remove('hidden');
      document.querySelector('.auth-tab[data-tab="register"]')?.classList.add('active');
    } else if (tab === 'reset') {
      resetForm?.classList.remove('hidden');
    }
  }
};

// ─── Setup Auth Event Listeners ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Tab switcher
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      AuthManager._switchAuthTab(tab.dataset.tab);
    });
  });

  // Login form submit
  document.getElementById('auth-login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    const errEl = document.getElementById('auth-login-error');

    if (!email || !password) {
      if (errEl) errEl.textContent = 'Vui lòng nhập email và mật khẩu';
      return;
    }

    const btn = document.getElementById('auth-login-btn');
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
    if (errEl) errEl.textContent = '';

    try {
      await AuthManager.signIn(email, password);
      AuthManager.hideAuthScreen();
      await App.initAfterAuth();
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Đăng nhập thất bại';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Đăng nhập';
    }
  });

  // Enter key on password field
  document.getElementById('auth-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('auth-login-btn')?.click();
  });

  // Register form submit
  document.getElementById('auth-register-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-reg-email')?.value.trim();
    const password = document.getElementById('auth-reg-password')?.value;
    const confirmPw = document.getElementById('auth-reg-confirm')?.value;
    const errEl = document.getElementById('auth-register-error');
    const successEl = document.getElementById('auth-register-success');

    if (!email || !password) {
      if (errEl) errEl.textContent = 'Vui lòng nhập đầy đủ thông tin';
      return;
    }
    if (password.length < 6) {
      if (errEl) errEl.textContent = 'Mật khẩu ít nhất 6 ký tự';
      return;
    }
    if (password !== confirmPw) {
      if (errEl) errEl.textContent = 'Mật khẩu xác nhận không khớp';
      return;
    }

    const btn = document.getElementById('auth-register-btn');
    btn.disabled = true;
    btn.textContent = 'Đang đăng ký...';
    if (errEl) errEl.textContent = '';
    if (successEl) successEl.textContent = '';

    try {
      const result = await AuthManager.signUp(email, password);
      if (result.needsConfirmation) {
        if (successEl) successEl.textContent = '✅ Đã gửi email xác nhận! Vui lòng kiểm tra hộp thư và nhấn link xác nhận, sau đó đăng nhập lại.';
        if (errEl) errEl.textContent = '';
      } else {
        AuthManager.hideAuthScreen();
        await App.initAfterAuth();
      }
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Đăng ký thất bại';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Đăng ký';
    }
  });

  // Reset password
  document.getElementById('auth-reset-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-reset-email')?.value.trim();
    const errEl = document.getElementById('auth-reset-error');
    const successEl = document.getElementById('auth-reset-success');

    if (!email) {
      if (errEl) errEl.textContent = 'Vui lòng nhập email';
      return;
    }

    const btn = document.getElementById('auth-reset-btn');
    btn.disabled = true;
    btn.textContent = 'Đang gửi...';

    try {
      await AuthManager.resetPassword(email);
      if (successEl) successEl.textContent = '✅ Đã gửi email đặt lại mật khẩu!';
      if (errEl) errEl.textContent = '';
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Gửi thất bại';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Gửi email đặt lại';
    }
  });

  // Forgot password link
  document.getElementById('auth-forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    AuthManager._switchAuthTab('reset');
  });

  // Back to login from reset
  document.getElementById('auth-back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    AuthManager._switchAuthTab('login');
  });
});
