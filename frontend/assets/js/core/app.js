/**
 * HopeConnect AI - Global Application Logic
 * Shared helpers (safe HTML, validation, API calls, formatting), navbar, toasts
 * and modals. Loaded on every page after store.js. Login/sign-up lives in auth.js.
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

  /**
   * Validators. Each returns an error message, or '' when valid.
   * These match the server's rules exactly (backend/src/shared/schemas.ts).
   */
  validators: {
    required: (v, label) => (String(v).trim() ? '' : `${label} is required.`),
    name: v => {
      v = String(v).trim();
      if (!v) return 'Full name is required.';
      if (v.length < 2) return 'Name must be at least 2 characters.';
      if (v.length > 60) return 'Name must be at most 60 characters.';
      if (!/^[\p{L}][\p{L} .'-]*$/u.test(v)) return 'Name can only contain letters, spaces, dots, hyphens and apostrophes.';
      return '';
    },
    email: v => {
      v = String(v).trim();
      if (!v) return 'Email is required.';
      if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
      return '';
    },
    // Indian mobile: exactly 10 digits, starting with 6-9 (no +91, spaces or dashes)
    phone: v => {
      v = String(v).trim();
      if (!v) return 'Mobile number is required.';
      if (!/^\d+$/.test(v)) return 'Mobile number must contain digits only.';
      if (v.length !== 10) return 'Mobile number must be exactly 10 digits.';
      if (!/^[6-9]/.test(v)) return 'Mobile number must start with 6, 7, 8 or 9.';
      return '';
    },
    password: v => {
      if (!v) return 'Password is required.';
      if (v.length < 8) return 'Password must be at least 8 characters.';
      if (v.length > 72) return 'Password must be at most 72 characters.';
      if (!/[A-Za-z]/.test(v)) return 'Password must include at least one letter.';
      if (!/\d/.test(v)) return 'Password must include at least one number.';
      if (v.trim() !== v) return 'Password cannot start or end with a space.';
      return '';
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
    rules.forEach(({ input, checks, raw }) => {
      // raw: true -> don't trim (passwords may legitimately contain spaces in the middle)
      const value = raw ? input.value : input.value.trim();
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

  // Coloured pill for a volunteer registration status
  statusPill(status) {
    const map = { Attended: 'unlocked', Registered: 'info', 'No-show': 'closed', Cancelled: 'locked' };
    return `<span class="badge-status-pill ${map[status] || 'locked'}">${HC.escape(status)}</span>`;
  },

  /**
   * Link to another page that works from BOTH index.html and pages/*.html.
   *   HC.page('volunteer.html', { opp: 'opp-2' })  ->  "pages/volunteer.html?opp=opp-2" (from index)
   *                                               ->  "volunteer.html?opp=opp-2"       (from pages/)
   */
  page(file, params) {
    const inPagesFolder = window.location.pathname.includes('/pages/');
    let path;
    if (file === 'index.html') path = inPagesFolder ? '../index.html' : 'index.html';
    else path = inPagesFolder ? file : `pages/${file}`;
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return path + query;
  },

  /**
   * Call the backend API. Always resolves (never throws) to { ok, status, data }.
   * Cookies are sent automatically, so the login session just works.
   *   const { ok, data } = await HC.api('POST', '/api/auth/login', { identifier, password });
   */
  async api(method, path, body) {
    try {
      const res = await fetch(HC.API_BASE + path, {
        method,
        credentials: 'include',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch {
      return {
        ok: false,
        status: 0,
        data: { error: 'Cannot reach the server. Make sure the backend is running (npm run dev in the backend folder).', code: 'NETWORK_ERROR' }
      };
    }
  },

  /**
   * Show the server's field errors under the matching inputs.
   *   fieldMap: { email: emailInput, phone: phoneInput, ... }
   * Returns true if at least one field error was shown.
   */
  showServerErrors(fieldMap, data) {
    let shown = false;
    (data.fields || []).forEach(({ field, message }) => {
      if (fieldMap[field]) {
        HC.setFieldError(fieldMap[field], message);
        if (!shown) fieldMap[field].focus();
        shown = true;
      }
    });
    return shown;
  },

  // Disable a submit button and show a spinner while a request is running
  setLoading(button, loading, loadingText = 'Please wait...') {
    if (!button) return;
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${HC.escape(loadingText)}`;
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  },

  clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => (el.textContent = ''));
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }
};
window.HC = HC;

/* ==========================================================================
   Page lifecycle (used by the no-reload navigation in router.js)
   Page scripts must use these instead of DOMContentLoaded / document listeners /
   window.x = ..., so that nothing is left behind when you move to another page.
   ========================================================================== */
const pageCleanups = [];

// Run fn once the page content is ready. If it already is (no-reload navigation), run it
// right after the current script finishes, so all of the script's variables exist first.
// Page code also waits until the server data (HCStore) is loaded and fresh.
let serverWarningShown = false;
HC.ready = function(fn) {
  const run = async () => {
    if (window.HCStore?.ensureFresh) await window.HCStore.ensureFresh();
    if (window.HCStore?.loadError && !serverWarningShown) {
      serverWarningShown = true;
      window.showToast?.(window.HCStore.loadError, 'error', 'fas fa-wifi');
    }
    fn();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else queueMicrotask(run);
};

// addEventListener that is automatically removed when leaving the page
HC.onPage = function(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  pageCleanups.push(() => target.removeEventListener(type, handler, options));
};

// window[name] = value, automatically removed when leaving the page
HC.expose = function(name, value) {
  window[name] = value;
  pageCleanups.push(() => {
    if (window[name] === value) delete window[name];
  });
};

// Go to another page of the site — without a reload when the router is active
HC.go = function(url) {
  if (typeof HC.navigate === 'function') HC.navigate(new URL(url, window.location.href).href);
  else window.location.href = url;
};

// Called by the router just before it swaps in the next page
HC.cleanupPage = function() {
  while (pageCleanups.length) {
    try { pageCleanups.pop()(); } catch (err) { console.warn(err); }
  }
};

/**
 * Where the API lives. Normally the backend serves the website itself (same address),
 * so this is ''. If the site is opened from the static server on :5500 or as a file,
 * talk to the backend on :4000 instead.
 */
HC.API_BASE = (window.location.protocol === 'file:' || window.location.port === '5500') ? 'http://localhost:4000' : '';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initToastContainer();
  initModals();
  highlightActiveNavLink();
});

// After the router swaps in a new page: re-connect the parts that live in the new HTML
document.addEventListener('hc:page-ready', () => {
  initNavbar();
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

// Closes the phone menu and resets the ✕ icon back to ☰ (used after choosing an item)
window.closeMobileMenu = function() {
  const navLinks = document.querySelector('.nav-links');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  navLinks?.classList.remove('active');
  if (mobileBtn) {
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.querySelector('i')?.classList.replace('fa-times', 'fa-bars');
  }
};

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    // Compare file names only, so "../index.html" and "pages/volunteer.html" both work
    const linkFile = link.getAttribute('href').split(/[?#]/)[0].split('/').pop();
    link.classList.toggle('active', linkFile === currentPath);
  });
}

/* ==========================================================================
   Modal Helpers
   ========================================================================== */
function initModals() {
  // Event delegation: works for modals added later too (e.g. the login modal from auth.js)
  document.addEventListener('click', (e) => {
    if (e.target.classList?.contains('modal-backdrop')) {
      closeModal(e.target.id);
      return;
    }
    const closeBtn = e.target.closest?.('.modal-close-btn');
    if (closeBtn) {
      const backdrop = closeBtn.closest('.modal-backdrop');
      if (backdrop) closeModal(backdrop.id);
    }
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
