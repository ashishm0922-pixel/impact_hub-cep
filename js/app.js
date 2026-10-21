/**
 * HopeConnect AI - Global Application Logic
 * Shared helpers (safe HTML, validation, formatting), navbar, toasts,
 * modals, demo profile and role switcher. Loaded on every page after store.js.
 */

/* ==========================================================================
   Safety helpers — ALWAYS use these when putting data into innerHTML
   ========================================================================== */
const HC = {
  // Escape text so user input like <script> shows as text instead of running.
  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Only allow http(s) image/link URLs. Blocks "javascript:" and other tricks.
  safeUrl(url, fallback = '') {
    try {
      const parsed = new URL(String(url), window.location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? HC.escape(parsed.href) : HC.escape(fallback);
    } catch {
      return HC.escape(fallback);
    }
  },

  formatINR(amount) {
    return '₹' + (Number(amount) || 0).toLocaleString('en-IN');
  },

  // "2026-11-03" -> "3 Nov 2026"
  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return HC.escape(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  // Simple validators. Each returns an error message, or '' when valid.
  validators: {
    required: (v, label) => (String(v).trim() ? '' : `${label} is required.`),
    name: v => (/^[\p{L} .'-]{2,60}$/u.test(String(v).trim()) ? '' : 'Enter a valid name (2–60 letters).'),
    email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? '' : 'Enter a valid email address.'),
    phone: v => {
      const digits = String(v).replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13 ? '' : 'Enter a valid phone number (10–13 digits).';
    },
    minLength: (v, n, label) => (String(v).trim().length >= n ? '' : `${label} must be at least ${n} characters.`)
  },

  // Show an error under a field (or clear it when message is '').
  setFieldError(input, message) {
    if (!input) return;
    const group = input.closest('.form-group') || input.parentElement;
    let errorEl = group.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      errorEl.setAttribute('role', 'alert');
      group.appendChild(errorEl);
    }
    errorEl.textContent = message;
    input.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  },

  /**
   * Validate a list of { input, checks: [fn, fn] } rules.
   * Each check gets the trimmed value and returns '' or an error message.
   * Returns true when everything is valid, and focuses the first bad field.
   */
  validateFields(rules) {
    let firstInvalid = null;
    rules.forEach(({ input, checks }) => {
      const value = input.value.trim();
      const error = checks.map(check => check(value)).find(Boolean) || '';
      HC.setFieldError(input, error);
      if (error && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      window.showToast('Please fix the highlighted fields.', 'error', 'fas fa-exclamation-circle');
    }
    return !firstInvalid;
  },

  clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => (el.textContent = ''));
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }
};
window.HC = HC;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initToastContainer();
  initProfileModal();
  initModals();
  initRoleSwitcher();
  initDemoNotice();
  highlightActiveNavLink();
});

/* ==========================================================================
   Toasts (text is inserted with textContent, so it is always safe)
   ========================================================================== */
function initToastContainer() {
  if (!document.getElementById('toastContainer')) {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
}

window.showToast = function(message, type = 'success', icon = 'fas fa-check-circle') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconEl = document.createElement('i');
  iconEl.className = `${icon} toast-icon`;
  const content = document.createElement('div');
  content.className = 'toast-content';
  const text = document.createElement('span');
  text.textContent = message;
  content.appendChild(text);
  toast.append(iconEl, content);

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4500);
};

/* ==========================================================================
   Navbar & Mobile Menu
   ========================================================================== */
function initNavbar() {
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileBtn && navLinks) {
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.addEventListener('click', () => {
      const open = navLinks.classList.toggle('active');
      mobileBtn.setAttribute('aria-expanded', String(open));
      const icon = mobileBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars', !open);
        icon.classList.toggle('fa-times', open);
      }
    });
  }
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === currentPath);
  });
}

/* ==========================================================================
   Demo notice (honest labelling) + reset button in the footer
   ========================================================================== */
function initDemoNotice() {
  const footer = document.querySelector('.site-footer .container');
  if (!footer || document.getElementById('demoNotice')) return;

  const notice = document.createElement('div');
  notice.id = 'demoNotice';
  notice.className = 'demo-notice';
  notice.innerHTML = `
    <span><i class="fas fa-flask"></i> <strong>Demo mode:</strong> data is stored only in this browser.
    No real payments, emails or logins happen.</span>
    <button type="button" class="btn btn-sm btn-outline" id="resetDemoBtn"><i class="fas fa-undo"></i> Reset demo data</button>
  `;
  footer.appendChild(notice);

  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    if (confirm('Reset all demo data in this browser? Your registrations, demo donations and created campaigns will be removed.')) {
      window.HCStore.resetDemoData();
      window.location.reload();
    }
  });
}

/* ==========================================================================
   Role Switcher (demo views)
   ========================================================================== */
function initRoleSwitcher() {
  const roleSelect = document.getElementById('roleSwitcherSelect');
  if (!roleSelect) return;

  roleSelect.value = window.HCStore.getCurrentRole();
  roleSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    window.HCStore.setCurrentRole(selected);
    window.showToast(`Switched to ${selected.toUpperCase()} view (demo)`, 'info', 'fas fa-user-circle');
    if (selected === 'ngo' && !window.location.pathname.includes('dashboard.html')) {
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    }
  });
}

/* ==========================================================================
   Demo Profile modal (replaces the old fake login)
   The "Login" / "Join" buttons call openModal('authModal') on every page,
   so we inject the modal here if the page doesn't have one.
   ========================================================================== */
function initProfileModal() {
  const existing = document.getElementById('authModal');
  if (existing) existing.remove(); // the old index.html version had a fake sign-in

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'authModal';
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
      <div class="modal-header">
        <h3 id="authModalTitle" style="font-size: 1.25rem;"><i class="fas fa-user-circle" style="color: var(--accent-gold-hover);"></i> Your Demo Profile</h3>
        <button class="modal-close-btn" aria-label="Close">&times;</button>
      </div>
      <form id="profileForm" novalidate>
        <div class="modal-body">
          <div class="demo-callout">
            <i class="fas fa-info-circle"></i>
            Real accounts are not built yet. This profile has <strong>no password</strong> and is saved only in this browser.
            It is used to pre-fill forms and to show <em>your</em> activity on the Impact page.
          </div>
          <div class="form-group">
            <label for="profileName">Full Name *</label>
            <input type="text" class="form-control" id="profileName" autocomplete="name">
          </div>
          <div class="form-group">
            <label for="profileEmail">Email Address *</label>
            <input type="email" class="form-control" id="profileEmail" autocomplete="email">
          </div>
          <div class="form-group">
            <label for="profileRole">Primary Role</label>
            <select class="form-control" id="profileRole">
              <option value="volunteer">🙋 Volunteer</option>
              <option value="donor">❤️ Donor / Supporter</option>
              <option value="ngo">🏢 NGO Lead / Organizer</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('authModal')">Cancel</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Profile</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('#profileForm');
  const nameInput = modal.querySelector('#profileName');
  const emailInput = modal.querySelector('#profileEmail');
  const roleInput = modal.querySelector('#profileRole');

  // Pre-fill each time the modal opens
  modal.addEventListener('hc:open', () => {
    const profile = window.HCStore.getProfile();
    nameInput.value = profile.name || '';
    emailInput.value = profile.email || '';
    roleInput.value = profile.role || 'volunteer';
    HC.clearFieldErrors(form);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = HC.validateFields([
      { input: nameInput, checks: [HC.validators.name] },
      { input: emailInput, checks: [HC.validators.email] }
    ]);
    if (!valid) return;

    const profile = window.HCStore.saveProfile({
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      role: roleInput.value
    });
    closeModal('authModal');
    window.showToast(`Profile saved for ${profile.name}. (Demo profile — no password.)`, 'success', 'fas fa-user-check');

    const roleSelect = document.getElementById('roleSwitcherSelect');
    if (roleSelect) roleSelect.value = profile.role;
    document.dispatchEvent(new CustomEvent('hc:profile-changed'));
    if (profile.role === 'ngo' && !window.location.pathname.includes('dashboard.html')) {
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    }
  });
}

/* ==========================================================================
   Modal Helpers
   ========================================================================== */
function initModals() {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const backdrop = btn.closest('.modal-backdrop');
      if (backdrop) closeModal(backdrop.id);
    });
  });

  // Escape key closes the open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = document.querySelector('.modal-backdrop.active');
      if (open) closeModal(open.id);
    }
  });
}

window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.dispatchEvent(new CustomEvent('hc:open'));
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  const firstField = modal.querySelector('input:not([type=hidden]), select, textarea');
  if (firstField) setTimeout(() => firstField.focus(), 50);
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
};
