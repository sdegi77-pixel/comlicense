(function () {
  const SUPABASE_URL = 'https://asxetowpklocvfjviynh.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGV0b3dwa2xvY3ZmanZpeW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjgzMTAsImV4cCI6MjExMDQwNDMxMH0.g4HfrFzXmVI5pHP2AkzMyaDAt3LZ6UXKxumEYE3ck1I';

  const SESSION_KEY = 'hobak_auth_session_v1';

  let pendingOnSuccess = null;
  let modalMode = 'login';

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.user) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    syncHeaderUI();
    window.dispatchEvent(new CustomEvent('hobak-auth-change', { detail: session }));
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session || !session.user) return null;
    const meta = session.user.user_metadata || {};
    return {
      id: session.user.id,
      email: session.user.email,
      nickname: session.nickname || meta.nickname || '호박이웃',
      region: session.region || meta.region || '방이동',
      accessToken: session.access_token || null
    };
  }

  async function upsertProfile(userId, nickname, region, accessToken) {
    const token = accessToken || SUPABASE_ANON_KEY;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: userId,
          nickname: nickname || '호박이웃',
          region: region || '방이동',
          manner_temp: 36.5
        })
      });
    } catch (err) {
      console.warn('Profile upsert warning:', err);
    }
  }

  async function fetchProfileNickname(userId, accessToken) {
    const token = accessToken || SUPABASE_ANON_KEY;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=nickname,region`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      return rows && rows[0] ? rows[0] : null;
    } catch {
      return null;
    }
  }

  async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || '이메일 또는 비밀번호를 확인해주세요.');
    }

    const profile = await fetchProfileNickname(data.user.id, data.access_token);
    const meta = data.user.user_metadata || {};
    const nickname = (profile && profile.nickname) || meta.nickname || email.split('@')[0];
    const region = (profile && profile.region) || meta.region || '방이동';

    if (!profile) {
      await upsertProfile(data.user.id, nickname, region, data.access_token);
    }

    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
      nickname,
      region
    };
    saveSession(session);
    return session;
  }

  async function signUp(email, password, nickname) {
    const cleanNick = (nickname || '').trim();
    if (!cleanNick) {
      throw new Error('닉네임을 입력해주세요.');
    }

    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        data: { nickname: cleanNick, region: '방이동' }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || '회원가입에 실패했습니다.');
    }

    const user = data.user || (data.id ? data : null);
    if (user && user.id) {
      await upsertProfile(user.id, cleanNick, '방이동', data.access_token);
    }

    if (data.access_token && data.user) {
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
        nickname: cleanNick,
        region: '방이동'
      };
      saveSession(session);
      return { session, needsEmailConfirm: false };
    }

    // If email confirmation is enabled on the Supabase project
    return { session: null, needsEmailConfirm: true };
  }

  async function signOut() {
    const session = getSession();
    if (session && session.access_token) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`
          }
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    saveSession(null);
  }

  function ensureModalDom() {
    if (document.getElementById('authModalBackdrop')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'authModalBackdrop';
    wrapper.className = 'auth-modal-backdrop';
    wrapper.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
        <div class="auth-modal-header">
          <h2 class="auth-modal-title" id="authModalTitle">🎃 호박마켓 로그인</h2>
          <button type="button" class="auth-modal-close" id="authModalClose" aria-label="닫기">✕</button>
        </div>

        <div class="auth-tabs">
          <button type="button" class="auth-tab active" data-auth-mode="login">로그인</button>
          <button type="button" class="auth-tab" data-auth-mode="signup">회원가입</button>
        </div>

        <form class="auth-form" id="authForm" novalidate>
          <div class="auth-field" id="authNicknameField" style="display:none;">
            <label for="authNicknameInput">닉네임 (필수)</label>
            <input type="text" id="authNicknameInput" placeholder="예: 헤엄치는오리" maxlength="20" />
          </div>

          <div class="auth-field">
            <label for="authEmailInput">이메일</label>
            <input type="email" id="authEmailInput" placeholder="example@email.com" required />
          </div>

          <div class="auth-field">
            <label for="authPasswordInput">비밀번호</label>
            <input type="password" id="authPasswordInput" placeholder="6자 이상 입력" required />
          </div>

          <div class="auth-error" id="authErrorMsg"></div>

          <button type="submit" class="auth-submit-btn" id="authSubmitBtn">로그인</button>
        </form>
      </div>
    `;

    document.body.appendChild(wrapper);

    const closeBtn = document.getElementById('authModalClose');
    const authForm = document.getElementById('authForm');
    const tabs = wrapper.querySelectorAll('.auth-tab');
    const nicknameField = document.getElementById('authNicknameField');
    const nicknameInput = document.getElementById('authNicknameInput');
    const emailInput = document.getElementById('authEmailInput');
    const passwordInput = document.getElementById('authPasswordInput');
    const errorEl = document.getElementById('authErrorMsg');
    const submitBtn = document.getElementById('authSubmitBtn');
    const titleEl = document.getElementById('authModalTitle');

    function setMode(mode) {
      modalMode = mode;
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.authMode === mode));
      const isSignup = mode === 'signup';
      nicknameField.style.display = isSignup ? 'flex' : 'none';
      nicknameInput.required = isSignup;
      submitBtn.textContent = isSignup ? '회원가입' : '로그인';
      titleEl.textContent = isSignup ? '🎃 호박마켓 회원가입' : '🎃 호박마켓 로그인';
      errorEl.textContent = '';
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => setMode(tab.dataset.authMode));
    });

    closeBtn.addEventListener('click', closeModal);
    wrapper.addEventListener('click', (e) => {
      if (e.target === wrapper) closeModal();
    });

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const nickname = nicknameInput.value.trim();

      if (!email) {
        errorEl.textContent = '이메일을 입력해주세요.';
        emailInput.focus();
        return;
      }
      if (!password || password.length < 6) {
        errorEl.textContent = '비밀번호는 6자 이상 입력해주세요.';
        passwordInput.focus();
        return;
      }
      if (modalMode === 'signup' && !nickname) {
        errorEl.textContent = '회원가입 시 닉네임은 필수입니다.';
        nicknameInput.focus();
        return;
      }

      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '처리 중...';

      try {
        if (modalMode === 'signup') {
          const result = await signUp(email, password, nickname);
          if (result.needsEmailConfirm) {
            errorEl.style.color = '#00a05b';
            errorEl.textContent = '인증 메일을 발송했어요. 메일 인증 후 로그인해주세요!';
            setMode('login');
            submitBtn.disabled = false;
            return;
          }
        } else {
          await signIn(email, password);
        }

        const cb = pendingOnSuccess;
        pendingOnSuccess = null;
        closeModal();
        if (typeof cb === 'function') cb();
      } catch (err) {
        errorEl.style.color = '#e03131';
        errorEl.textContent = err.message || '요청 처리 중 오류가 발생했습니다.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = modalMode === 'signup' ? '회원가입' : '로그인';
      }
    });

    wrapper._setMode = setMode;
  }

  function openModal(options = {}) {
    ensureModalDom();
    const backdrop = document.getElementById('authModalBackdrop');
    const errorEl = document.getElementById('authErrorMsg');
    if (errorEl) errorEl.textContent = '';
    pendingOnSuccess = typeof options.onSuccess === 'function' ? options.onSuccess : null;
    if (backdrop._setMode) {
      backdrop._setMode(options.mode || 'login');
    }
    backdrop.classList.add('open');
    const emailInput = document.getElementById('authEmailInput');
    if (emailInput) setTimeout(() => emailInput.focus(), 50);
  }

  function closeModal() {
    const backdrop = document.getElementById('authModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function syncHeaderUI() {
    const user = getCurrentUser();
    const loginBtn = document.getElementById('btnOpenLogin');
    const nickBadge = document.getElementById('userNicknameBadge');
    const logoutBtn = document.getElementById('btnLogout');

    if (loginBtn) loginBtn.style.display = user ? 'none' : 'inline-flex';
    if (nickBadge) {
      nickBadge.style.display = user ? 'inline-flex' : 'none';
      if (user) nickBadge.textContent = user.nickname;
    }
    if (logoutBtn) logoutBtn.style.display = user ? 'inline-flex' : 'none';
  }

  function bindGlobalAuthTriggers() {
    const loginBtn = document.getElementById('btnOpenLogin');
    const logoutBtn = document.getElementById('btnLogout');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => openModal({ mode: 'login' }));
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await signOut();
        if (window.location.pathname.endsWith('write.html')) {
          window.location.href = 'index.html';
        }
      });
    }

    // Intercept "+ 글쓰기" links when not logged in
    document.addEventListener('click', (e) => {
      const writeLink = e.target.closest('a[href="write.html"]');
      if (!writeLink) return;
      if (!getCurrentUser()) {
        e.preventDefault();
        openModal({
          mode: 'login',
          onSuccess: () => {
            window.location.href = 'write.html';
          }
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureModalDom();
    syncHeaderUI();
    bindGlobalAuthTriggers();
  });

  window.HobakAuth = {
    getSession,
    getCurrentUser,
    signIn,
    signUp,
    signOut,
    openModal,
    closeModal,
    syncHeaderUI
  };
})();
