/**
 * HopeConnect AI - Login & Sign-up (real accounts, stored in MongoDB by the backend)
 *
 * Flow:  Sign up → go to the Login tab → log in right away → click the link in the
 *        verification email → account is verified. (Optionally an admin must also approve.)
 * The session lives in an httpOnly cookie set by the server. This file never stores
 * passwords or tokens — it only asks the server "who am I?" (GET /api/auth/me).
 *
 * Loaded on every page after app.js. Uses: HC.api, HC.validators, HC.setFieldError.
 */

const Auth = {
  user: null,     // the logged-in user, or null
  checked: false  // true once we've asked the server
};
window.Auth = Auth;

document.addEventListener('DOMContentLoaded', () => {
  buildAuthModal();
  renderAuthArea();
  refreshCurrentUser();
});

/* ==========================================================================
   Session state
   ========================================================================== */
async function refreshCurrentUser() {
  const { ok, data } = await HC.api('GET', '/api/auth/session');
  setCurrentUser(ok ? data.user : null);
}

function setCurrentUser(user) {
  const changed = (Auth.user?.id || null) !== (user?.id || null);
  Auth.user = user;
  Auth.checked = true;

  // Keep the rest of the (demo) site in sync with who is logged in
  if (user) window.HCStore.setAccountProfile(user);
  else if (!window.HCStore.getProfile().isDemo) window.HCStore.clearAccountProfile();

  renderAuthArea();
  renderVerifyBanner();
  if (changed) {
    document.dispatchEvent(new CustomEvent('hc:auth-changed', { detail: { user } }));
    document.dispatchEvent(new CustomEvent('hc:profile-changed'));
  }
}

async function logout() {
  const { ok, data } = await HC.api('POST', '/api/auth/logout');
  if (!ok && data.code === 'NETWORK_ERROR') {
    window.showToast(data.error, 'error', 'fas fa-wifi');
    return;
  }
  setCurrentUser(null);
  window.showToast('You have been logged out.', 'info', 'fas fa-sign-out-alt');
}

/** Open the modal on a tab: HC.openAuth('login') or HC.openAuth('signup') */
HC.openAuth = function(tab = 'login') {
  switchAuthTab(tab);
  window.openModal('authModal');
};

/* ==========================================================================
   Header (desktop) + menu items (phone)
   ========================================================================== */
function renderAuthArea() {
  const area = document.getElementById('authArea');
  const e = HC.escape;
  const roleLabel = { volunteer: 'Volunteer', donor: 'Donor', ngo: 'NGO' };

  if (area) {
    area.innerHTML = Auth.user
      ? `<span class="auth-chip" title="${e(Auth.user.email)}">
           <i class="fas fa-user-circle"></i> ${e(Auth.user.name.split(' ')[0])}
           ${Auth.user.emailVerified
             ? `<span class="auth-chip-role">${e(roleLabel[Auth.user.role] || Auth.user.role)}</span>`
             : '<span class="auth-chip-role unverified" title="Email not verified yet">Unverified</span>'}
         </span>
         <button type="button" class="btn btn-sm btn-outline" data-auth="logout"><i class="fas fa-sign-out-alt"></i> Logout</button>`
      : `<button type="button" class="btn btn-sm btn-outline" data-auth="login">Login</button>
         <button type="button" class="btn btn-sm btn-primary" data-auth="signup">Sign up</button>`;
  }

  // Phone menu: same actions inside the hamburger menu
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.querySelectorAll('.nav-mobile-only').forEach(li => li.remove());
    const items = Auth.user
      ? [`<span class="nav-mobile-user"><i class="fas fa-user-circle"></i> ${e(Auth.user.name)}</span>`,
         '<button type="button" class="nav-link-button" data-auth="logout"><i class="fas fa-sign-out-alt"></i> Logout</button>']
      : ['<button type="button" class="nav-link-button" data-auth="login"><i class="fas fa-sign-in-alt"></i> Login</button>',
         '<button type="button" class="nav-link-button" data-auth="signup"><i class="fas fa-user-plus"></i> Sign up</button>'];
    items.forEach(html => {
      const li = document.createElement('li');
      li.className = 'nav-mobile-only';
      li.innerHTML = html;
      navLinks.appendChild(li);
    });
  }
}

// One click handler for every Login / Sign up / Logout button on the page
document.addEventListener('click', (event) => {
  const btn = event.target.closest?.('[data-auth]');
  if (!btn) return;
  window.closeMobileMenu();
  const action = btn.dataset.auth;
  if (action === 'logout') logout();
  else HC.openAuth(action);
});

/* ==========================================================================
   "Please verify your email" banner (shown under the header while unverified)
   ========================================================================== */
function renderVerifyBanner() {
  document.getElementById('verifyBanner')?.remove();
  if (!Auth.user || Auth.user.emailVerified) return;

  const banner = document.createElement('div');
  banner.id = 'verifyBanner';
  banner.className = 'verify-banner';
  banner.setAttribute('role', 'status');
  banner.innerHTML = `
    <div class="container verify-banner-inner">
      <span><i class="fas fa-envelope"></i> Please verify your email. We sent a link to <strong>${HC.escape(Auth.user.email)}</strong>.</span>
      <button type="button" class="btn btn-xs btn-outline" id="resendVerifyBtn">Resend email</button>
    </div>`;
  document.querySelector('.site-header')?.insertAdjacentElement('afterend', banner);

  banner.querySelector('#resendVerifyBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    HC.setLoading(btn, true, 'Sending...');
    const { ok, data } = await HC.api('POST', '/api/auth/resend-verification');
    HC.setLoading(btn, false);
    if (ok) {
      window.showToast(data.message, 'success', 'fas fa-paper-plane');
    } else if (data.code === 'ALREADY_VERIFIED') {
      refreshCurrentUser();
    } else {
      window.showToast(data.error || 'Could not send the email. Please try again.', 'error', 'fas fa-exclamation-circle');
    }
  });
}

// Another tab verified the email (verify-email page) → update this tab too
window.addEventListener('focus', () => {
  if (Auth.user && !Auth.user.emailVerified) refreshCurrentUser();
});

/* ==========================================================================
   Modal
   ========================================================================== */
function passwordField(id, label, autocomplete) {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <div class="password-wrap">
        <input type="password" class="form-control" id="${id}" autocomplete="${autocomplete}" maxlength="72">
        <button type="button" class="password-toggle" data-toggle-password="${id}" aria-label="Show password" title="Show password">
          <i class="fas fa-eye"></i>
        </button>
      </div>
    </div>`;
}

function buildAuthModal() {
  document.getElementById('authModal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'authModal';
  modal.innerHTML = `
    <div class="modal-card auth-card" style="max-width: 520px;" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
      <div class="modal-header">
        <h3 id="authModalTitle" style="font-size: 1.2rem;"><i class="fas fa-user-circle" style="color: var(--accent-gold-hover);"></i> Welcome to HopeConnect</h3>
        <button class="modal-close-btn" aria-label="Close">&times;</button>
      </div>

      <div class="auth-tabs" role="tablist">
        <button type="button" class="auth-tab" role="tab" id="authTabLogin" data-tab="login" aria-controls="loginForm">Login</button>
        <button type="button" class="auth-tab" role="tab" id="authTabSignup" data-tab="signup" aria-controls="signupForm">Sign up</button>
      </div>

      <!-- LOGIN -->
      <form id="loginForm" class="auth-form" novalidate role="tabpanel" aria-labelledby="authTabLogin">
        <div class="modal-body">
          <div class="form-alert" id="loginAlert" role="alert" hidden></div>
          <div class="form-group">
            <label for="loginIdentifier">Email or mobile number</label>
            <input type="text" class="form-control" id="loginIdentifier" autocomplete="username" maxlength="254"
                   placeholder="name@example.com or 9876543210">
          </div>
          ${passwordField('loginPassword', 'Password', 'current-password')}
        </div>
        <div class="modal-footer auth-footer">
          <span class="form-hint">New here? <a href="#" data-switch-tab="signup">Create an account</a></span>
          <button type="submit" class="btn btn-primary"><i class="fas fa-sign-in-alt"></i> Login</button>
        </div>
      </form>

      <!-- SIGN UP -->
      <form id="signupForm" class="auth-form" novalidate role="tabpanel" aria-labelledby="authTabSignup" hidden>
        <div class="modal-body">
          <div class="form-alert" id="signupAlert" role="alert" hidden></div>
          <div class="form-group">
            <label for="signupName">Full name *</label>
            <input type="text" class="form-control" id="signupName" autocomplete="name" maxlength="60" placeholder="e.g. Neha Kulkarni">
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="signupEmail">Email *</label>
              <input type="email" class="form-control" id="signupEmail" autocomplete="email" maxlength="254" placeholder="name@example.com">
            </div>
            <div class="form-group">
              <label for="signupPhone">Mobile number *</label>
              <div class="input-prefix-wrap">
                <span class="input-prefix">+91</span>
                <input type="tel" class="form-control" id="signupPhone" autocomplete="tel-national" inputmode="numeric" placeholder="10 digits">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="signupRole">I am joining as *</label>
            <select class="form-control" id="signupRole">
              <option value="volunteer">🙋 Volunteer</option>
              <option value="donor">❤️ Donor / Supporter</option>
              <option value="ngo">🏢 NGO / Organizer</option>
            </select>
          </div>
          <div class="form-row-2">
            ${passwordField('signupPassword', 'Password *', 'new-password')}
            ${passwordField('signupConfirm', 'Confirm password *', 'new-password')}
          </div>
          <ul class="password-rules" id="passwordRules" aria-live="polite">
            <li data-rule="length">At least 8 characters</li>
            <li data-rule="letter">At least one letter</li>
            <li data-rule="number">At least one number</li>
          </ul>
          <p class="form-hint"><i class="fas fa-envelope-open-text"></i> We'll email you a link to verify your address. You can log in right away.</p>
        </div>
        <div class="modal-footer auth-footer">
          <span class="form-hint">Already have an account? <a href="#" data-switch-tab="login">Login</a></span>
          <button type="submit" class="btn btn-primary"><i class="fas fa-user-plus"></i> Create account</button>
        </div>
      </form>

    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-tab], [data-switch-tab]');
    if (tabBtn) {
      e.preventDefault();
      switchAuthTab(tabBtn.dataset.tab || tabBtn.dataset.switchTab);
    }
    const toggle = e.target.closest('[data-toggle-password]');
    if (toggle) togglePassword(toggle);
  });

  setupLoginForm();
  setupSignupForm();
}

function switchAuthTab(tab) {
  const showLogin = tab === 'login';
  document.getElementById('loginForm').hidden = !showLogin;
  document.getElementById('signupForm').hidden = showLogin;
  document.querySelector('.auth-tabs').hidden = false;
  document.querySelectorAll('.auth-tab').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  const form = document.getElementById(showLogin ? 'loginForm' : 'signupForm');
  setTimeout(() => form.querySelector('input')?.focus(), 50);
}

function togglePassword(button) {
  const input = document.getElementById(button.dataset.togglePassword);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.innerHTML = `<i class="fas fa-eye${show ? '-slash' : ''}"></i>`;
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  button.title = show ? 'Hide password' : 'Show password';
}

function showAlert(id, message, type = 'error') {
  const box = document.getElementById(id);
  box.className = `form-alert ${type}`;
  box.textContent = message;
  box.hidden = !message;
}

/**
 * Validate a field when the user leaves it, and clear the error as soon as it becomes valid.
 * Gives instant feedback without shouting while they're still typing.
 */
function liveValidate(input, check) {
  input.addEventListener('blur', () => {
    if (input.value !== '') HC.setFieldError(input, check(input.value));
  });
  input.addEventListener('input', () => {
    if (input.classList.contains('is-invalid') && !check(input.value)) HC.setFieldError(input, '');
  });
}

/* ==========================================================================
   Login
   ========================================================================== */
function validateIdentifier(value) {
  const v = value.trim();
  if (!v) return 'Enter your email or mobile number.';
  if (v.includes('@')) return HC.validators.email(v);
  if (/^\d+$/.test(v)) return HC.validators.phone(v);
  return 'Enter a valid email or 10-digit mobile number.';
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  const identifier = document.getElementById('loginIdentifier');
  const password = document.getElementById('loginPassword');
  const submit = form.querySelector('button[type="submit"]');

  liveValidate(identifier, validateIdentifier);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.disabled) return; // already sending
    showAlert('loginAlert', '');

    const valid = HC.validateFields([
      { input: identifier, checks: [validateIdentifier] },
      { input: password, raw: true, checks: [v => (v ? '' : 'Enter your password.')] }
    ]);
    if (!valid) return;

    HC.setLoading(submit, true, 'Logging in...');
    const { ok, status, data } = await HC.api('POST', '/api/auth/login', {
      identifier: identifier.value.trim(),
      password: password.value
    });
    HC.setLoading(submit, false);

    if (ok) {
      form.reset();
      HC.clearFieldErrors(form);
      window.closeModal('authModal');
      setCurrentUser(data.user);
      window.showToast(data.message || 'Logged in.', 'success', 'fas fa-user-check');
      if (!data.user.emailVerified) {
        setTimeout(() => window.showToast(`Please verify your email: check ${data.user.email} for our link.`, 'info', 'fas fa-envelope'), 600);
      }
      return;
    }

    if (status === 400 && HC.showServerErrors({ identifier, password }, data)) return;

    // Pending / rejected / suspended → explain clearly; wrong password → clear the password field
    const type = ['ACCOUNT_PENDING'].includes(data.code) ? 'info' : 'error';
    showAlert('loginAlert', data.error || 'Login failed. Please try again.', type);
    if (data.code === 'INVALID_CREDENTIALS') {
      password.value = '';
      password.focus();
    }
  });
}

/* ==========================================================================
   Sign up
   ========================================================================== */
// Accepts pasted numbers like "+91 98765 43210" or "09876543210" and keeps just the 10 digits
function normalizePhoneInput(input) {
  let digits = input.value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (input.value !== digits) input.value = digits;
}

function updatePasswordRules(value) {
  const rules = {
    length: value.length >= 8,
    letter: /[A-Za-z]/.test(value),
    number: /\d/.test(value)
  };
  document.querySelectorAll('#passwordRules li').forEach(li => {
    li.classList.toggle('met', rules[li.dataset.rule]);
  });
}

function setupSignupForm() {
  const form = document.getElementById('signupForm');
  const fields = {
    name: document.getElementById('signupName'),
    email: document.getElementById('signupEmail'),
    phone: document.getElementById('signupPhone'),
    role: document.getElementById('signupRole'),
    password: document.getElementById('signupPassword'),
    confirmPassword: document.getElementById('signupConfirm')
  };
  const submit = form.querySelector('button[type="submit"]');
  const { validators } = HC;
  const confirmCheck = v => (!v ? 'Please confirm your password.' : v !== fields.password.value ? 'Passwords do not match.' : '');

  fields.phone.addEventListener('input', () => normalizePhoneInput(fields.phone));
  fields.password.addEventListener('input', () => updatePasswordRules(fields.password.value));

  liveValidate(fields.name, validators.name);
  liveValidate(fields.email, validators.email);
  liveValidate(fields.phone, validators.phone);
  liveValidate(fields.password, validators.password);
  liveValidate(fields.confirmPassword, confirmCheck);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    showAlert('signupAlert', '');
    normalizePhoneInput(fields.phone);

    const valid = HC.validateFields([
      { input: fields.name, checks: [validators.name] },
      { input: fields.email, checks: [validators.email] },
      { input: fields.phone, checks: [validators.phone] },
      { input: fields.password, raw: true, checks: [validators.password] },
      { input: fields.confirmPassword, raw: true, checks: [confirmCheck] }
    ]);
    if (!valid) return;

    HC.setLoading(submit, true, 'Creating account...');
    const { ok, data } = await HC.api('POST', '/api/auth/signup', {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      role: fields.role.value,
      password: fields.password.value,
      confirmPassword: fields.confirmPassword.value
    });
    HC.setLoading(submit, false);

    if (ok) {
      const email = fields.email.value.trim();
      form.reset();
      HC.clearFieldErrors(form);
      updatePasswordRules('');
      // Go straight to the Login tab, ready to log in
      switchAuthTab('login');
      document.getElementById('loginIdentifier').value = email;
      showAlert('loginAlert', data.message, 'success');
      setTimeout(() => document.getElementById('loginPassword').focus(), 60);
      return;
    }

    // Field problems (invalid or already registered) appear under the right input
    if (!HC.showServerErrors(fields, data)) {
      showAlert('signupAlert', data.error || 'Sign-up failed. Please try again.');
    }
  });
}
