/**
 * HopeConnect AI - Admin panel (pages/admin.html)
 * Admin login (username + password) and approving / rejecting / suspending user accounts.
 * The admin session is an httpOnly cookie that only the /api/admin/* routes receive.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  const adminState = {
    status: null, // set on first load: "pending" if admin approval is on, otherwise all users
    search: '',
    page: 1,
    totalPages: 1,
    pendingAction: null // { userId, status, name } while the reason modal is open
  };

  HC.ready(async () => {
    setupAdminLogin();
    setupAdminPanel();

    const { ok, data } = await HC.api('GET', '/api/admin/auth/me');
    document.getElementById('adminLoading').hidden = true;
    if (ok) showAdminPanel(data.admin);
    else if (data.code === 'NETWORK_ERROR' || data.code === 'DB_UNAVAILABLE') showAdminLogin(data.error);
    else showAdminLogin();
  });

  /* ---------------- Views ---------------- */
  function showAdminLogin(message = '') {
    document.getElementById('adminPanelView').hidden = true;
    document.getElementById('adminLoginView').hidden = false;
    document.getElementById('adminChip').hidden = true;
    document.getElementById('adminLogoutBtn').hidden = true;
    setAdminAlert(message);
    document.getElementById('adminUsername').focus();
  }

  function showAdminPanel(admin) {
    document.getElementById('adminLoginView').hidden = true;
    document.getElementById('adminPanelView').hidden = false;
    document.getElementById('adminName').textContent = admin.username;
    document.getElementById('adminChip').hidden = false;
    document.getElementById('adminLogoutBtn').hidden = false;
    loadUsers();
  }

  function setAdminAlert(message, type = 'error') {
    const box = document.getElementById('adminLoginAlert');
    box.className = `form-alert ${type}`;
    box.textContent = message;
    box.hidden = !message;
  }

  /** Any 401 while using the panel means the admin session ended → back to login. */
  function handleSessionLoss(status) {
    if (status === 401) {
      showAdminLogin('Your admin session has ended. Please log in again.');
      return true;
    }
    return false;
  }

  /* ---------------- Login / logout ---------------- */
  function setupAdminLogin() {
    const form = document.getElementById('adminLoginForm');
    const username = document.getElementById('adminUsername');
    const password = document.getElementById('adminPassword');
    const submit = form.querySelector('button[type="submit"]');

    document.getElementById('adminPasswordToggle').addEventListener('click', (e) => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      e.currentTarget.innerHTML = `<i class="fas fa-eye${show ? '-slash' : ''}"></i>`;
      e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled) return;
      setAdminAlert('');

      const valid = HC.validateFields([
        { input: username, checks: [v => (v ? '' : 'Enter your username.')] },
        { input: password, raw: true, checks: [v => (v ? '' : 'Enter your password.')] }
      ]);
      if (!valid) return;

      HC.setLoading(submit, true, 'Logging in...');
      const { ok, data } = await HC.api('POST', '/api/admin/auth/login', {
        username: username.value.trim(),
        password: password.value
      });
      HC.setLoading(submit, false);

      password.value = '';
      if (!ok) {
        setAdminAlert(data.error || 'Login failed.');
        password.focus();
        return;
      }
      form.reset();
      showAdminPanel(data.admin);
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
      await HC.api('POST', '/api/admin/auth/logout');
      showAdminLogin();
      window.showToast('Logged out of the admin panel.', 'info', 'fas fa-sign-out-alt');
    });
  }

  /* ---------------- User list ---------------- */
  function setupAdminPanel() {
    document.getElementById('adminStatusTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-status]');
      if (!tab) return;
      document.querySelectorAll('.admin-status-tab').forEach(t => t.classList.toggle('active', t === tab));
      adminState.status = tab.dataset.status;
      adminState.page = 1;
      loadUsers();
    });

    let searchTimer;
    document.getElementById('adminSearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        adminState.search = e.target.value.trim();
        adminState.page = 1;
        loadUsers();
      }, 300);
    });

    document.getElementById('adminRefreshBtn').addEventListener('click', loadUsers);
    document.getElementById('adminPrevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('adminNextPage').addEventListener('click', () => changePage(1));

    document.getElementById('adminUsersBody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, name } = btn.dataset;
      if (action === 'approved') updateStatus(id, 'approved', undefined, btn);
      else openReasonModal(id, action, name);
    });

    setupReasonModal();
  }

  function changePage(delta) {
    const next = adminState.page + delta;
    if (next < 1 || next > adminState.totalPages) return;
    adminState.page = next;
    loadUsers();
  }

  async function loadUsers() {
    const params = new URLSearchParams({ page: String(adminState.page) });
    const firstLoad = adminState.status === null;
    if (firstLoad) adminState.status = '';
    if (adminState.status) params.set('status', adminState.status);
    if (adminState.search) params.set('search', adminState.search);

    const body = document.getElementById('adminUsersBody');
    body.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    const { ok, status, data } = await HC.api('GET', `/api/admin/users?${params}`);
    if (handleSessionLoss(status)) return;
    if (!ok) {
      body.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #A93226;">${HC.escape(data.error || 'Could not load users.')}</td></tr>`;
      return;
    }

    // First load: when admins must approve accounts, start on the "Pending" tab
    if (firstLoad && data.requireAdminApproval && data.counts?.pending) {
      adminState.status = 'pending';
      document.getElementById('adminPanelHint').textContent = "Admin approval is ON: new accounts can't log in until you approve them.";
      return loadUsers();
    }
    document.querySelectorAll('.admin-status-tab').forEach(t => t.classList.toggle('active', t.dataset.status === adminState.status));

    // Counts on the status tabs
    const counts = data.counts || {};
    const all = Object.values(counts).reduce((a, b) => a + b, 0);
    document.querySelectorAll('[data-count]').forEach(el => {
      el.textContent = el.dataset.count === 'all' ? all : (counts[el.dataset.count] || 0);
    });

    adminState.totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
    document.getElementById('adminPageInfo').textContent =
      `${data.total} user${data.total === 1 ? '' : 's'} • page ${data.page} of ${adminState.totalPages}`;
    document.getElementById('adminPrevPage').disabled = data.page <= 1;
    document.getElementById('adminNextPage').disabled = data.page >= adminState.totalPages;

    body.innerHTML = data.users.length ? data.users.map(renderUserRow).join('') :
      '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No users here.</td></tr>';
  }

  const ROLE_LABEL = { volunteer: 'Volunteer', donor: 'Donor', ngo: 'NGO' };

  const STATUS_PILL = {
    pending: '<span class="badge-status-pill pending">Pending</span>',
    approved: '<span class="badge-status-pill unlocked">Approved</span>',
    rejected: '<span class="badge-status-pill closed">Rejected</span>',
    suspended: '<span class="badge-status-pill locked">Suspended</span>'
  };

  function renderUserRow(user) {
    const e = HC.escape;
    const signedUp = new Date(user.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const button = (action, label, style) =>
      `<button type="button" class="btn btn-xs ${style}" data-action="${action}" data-id="${e(user.id)}" data-name="${e(user.name)}">${label}</button>`;

    const actions = {
      pending: button('approved', '<i class="fas fa-check"></i> Approve', 'btn-green') + button('rejected', 'Reject', 'btn-outline'),
      approved: button('suspended', 'Suspend', 'btn-outline'),
      rejected: button('approved', 'Approve', 'btn-outline'),
      suspended: button('approved', 'Re-activate', 'btn-outline')
    }[user.status] || '';

    return `
      <tr>
        <td><strong>${e(user.name)}</strong><div style="font-size: 0.8rem; color: var(--text-muted);">${e(user.email)}</div></td>
        <td>${e(user.phone)}</td>
        <td>${e(ROLE_LABEL[user.role] || user.role)}</td>
        <td>${user.emailVerified
          ? '<span class="badge-status-pill unlocked"><i class="fas fa-check"></i> Verified</span>'
          : '<span class="badge-status-pill pending">Not verified</span>'}</td>
        <td style="white-space: nowrap;">${e(signedUp)}</td>
        <td>${STATUS_PILL[user.status] || e(user.status)}
          ${user.statusReason ? `<div style="font-size: 0.75rem; color: var(--text-muted); max-width: 200px;">${e(user.statusReason)}</div>` : ''}</td>
        <td><div class="table-actions">${actions}</div></td>
      </tr>`;
  }

  async function updateStatus(userId, status, reason, buttonEl) {
    HC.setLoading(buttonEl, true, '...');
    const { ok, status: httpStatus, data } = await HC.api('PATCH', `/api/admin/users/${encodeURIComponent(userId)}/status`, { status, reason });
    HC.setLoading(buttonEl, false);
    if (handleSessionLoss(httpStatus)) return false;
    if (!ok) {
      window.showToast(data.error || 'Could not update the user.', 'error', 'fas fa-exclamation-circle');
      return false;
    }
    window.showToast(data.message, 'success', 'fas fa-user-check');
    loadUsers();
    return true;
  }

  /* ---------------- Reject / suspend reason ---------------- */
  function openReasonModal(userId, status, name) {
    adminState.pendingAction = { userId, status, name };
    const verb = status === 'rejected' ? 'Reject' : 'Suspend';
    document.getElementById('reasonTitle').textContent = `${verb} ${name}?`;
    document.getElementById('reasonIntro').textContent = status === 'rejected'
      ? 'They will not be able to log in. You can approve them later if needed.'
      : 'They will be logged out on every device immediately and cannot log in until re-activated.';
    document.getElementById('reasonSubmit').textContent = verb;
    const text = document.getElementById('reasonText');
    text.value = '';
    HC.setFieldError(text, '');
    window.openModal('reasonModal');
  }

  function setupReasonModal() {
    const form = document.getElementById('reasonForm');
    const text = document.getElementById('reasonText');
    const submit = document.getElementById('reasonSubmit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled || !adminState.pendingAction) return;
      const valid = HC.validateFields([
        { input: text, checks: [v => (v.length >= 3 ? '' : 'Please give a short reason (at least 3 characters).')] }
      ]);
      if (!valid) return;

      const { userId, status } = adminState.pendingAction;
      if (await updateStatus(userId, status, text.value.trim(), submit)) {
        adminState.pendingAction = null;
        window.closeModal('reasonModal');
      }
    });
  }
})();
