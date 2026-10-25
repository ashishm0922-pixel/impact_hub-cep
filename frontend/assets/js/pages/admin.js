/**
 * HopeConnect AI - Admin panel (pages/admin.html)
 * Tabs: Overview • Verification Queue (NGOs) • Users • Audit Logs • Leaderboard • Flagged Content
 * The admin session is an httpOnly cookie that only /api/admin/* routes receive.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  const e = (v) => HC.escape(v);
  const state = {
    tab: 'overview',
    ngos: { status: 'pending', search: '' },
    users: { status: '', search: '', page: 1 },
    audit: { search: '', action: '', from: '', to: '', page: 1 },
    board: 'volunteers',
    reports: 'open',
    pendingAction: null // what the reason/password modal will do
  };
  const ROLE_LABEL = { volunteer: 'Volunteer', donor: 'Donor', ngo: 'NGO' };

  HC.ready(async () => {
    setupLogin();
    setupTabs();
    setupReasonModal();
    const { ok, data } = await HC.api('GET', '/api/admin/auth/me');
    document.getElementById('adminLoading').hidden = true;
    if (ok) showPanel(data.admin);
    else showLogin(['NETWORK_ERROR', 'DB_UNAVAILABLE'].includes(data.code) ? data.error : '');
  });

  /* ==========================================================================
     Login / logout / session
     ========================================================================== */
  function showLogin(message = '') {
    document.getElementById('adminPanelView').hidden = true;
    document.getElementById('adminLoginView').hidden = false;
    document.getElementById('adminChip').hidden = true;
    document.getElementById('adminLogoutBtn').hidden = true;
    setLoginAlert(message);
    document.getElementById('adminUsername').focus();
  }

  function showPanel(admin) {
    document.getElementById('adminLoginView').hidden = true;
    document.getElementById('adminPanelView').hidden = false;
    document.getElementById('adminName').textContent = admin.username;
    document.getElementById('adminDisplayName').textContent = admin.username;
    document.getElementById('adminChip').hidden = false;
    document.getElementById('adminLogoutBtn').hidden = false;
    loadTab();
  }

  function setLoginAlert(message, type = 'error') {
    const box = document.getElementById('adminLoginAlert');
    box.className = `form-alert ${type}`;
    box.textContent = message;
    box.hidden = !message;
  }

  /** Any 401 means the admin session ended → back to login. */
  function sessionLost(status) {
    if (status === 401) {
      showLogin('Your admin session has ended. Please log in again.');
      return true;
    }
    return false;
  }

  async function api(method, path, body) {
    const res = await HC.api(method, path, body);
    if (sessionLost(res.status)) return null;
    return res;
  }

  function setupLogin() {
    const form = document.getElementById('adminLoginForm');
    const username = document.getElementById('adminUsername');
    const password = document.getElementById('adminPassword');
    const submit = form.querySelector('button[type="submit"]');

    document.getElementById('adminPasswordToggle').addEventListener('click', (ev) => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      ev.currentTarget.innerHTML = `<i class="fas fa-eye${show ? '-slash' : ''}"></i>`;
      ev.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (submit.disabled) return;
      setLoginAlert('');
      const valid = HC.validateFields([
        { input: username, checks: [v => (v ? '' : 'Enter your username.')] },
        { input: password, raw: true, checks: [v => (v ? '' : 'Enter your password.')] }
      ]);
      if (!valid) return;

      HC.setLoading(submit, true, 'Logging in...');
      const { ok, data } = await HC.api('POST', '/api/admin/auth/login', { username: username.value.trim(), password: password.value });
      HC.setLoading(submit, false);
      password.value = '';
      if (!ok) {
        setLoginAlert(data.error || 'Login failed.');
        password.focus();
        return;
      }
      form.reset();
      showPanel(data.admin);
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
      await HC.api('POST', '/api/admin/auth/logout');
      showLogin();
      window.showToast('Logged out of the admin panel.', 'info', 'fas fa-sign-out-alt');
    });
  }

  /* ==========================================================================
     Tabs
     ========================================================================== */
  function setupTabs() {
    document.querySelectorAll('[data-admin-tab]').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.adminTab)));
    // One click handler for every button inside the tab area
    document.getElementById('adminTabContent').addEventListener('click', handleAction);
  }

  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll('[data-admin-tab]').forEach(t => t.classList.toggle('active', t.dataset.adminTab === tab));
    loadTab();
  }

  function loading() {
    document.getElementById('adminTabContent').innerHTML = '<div class="dash-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  }

  function loadTab() {
    loading();
    ({ overview: loadOverview, ngos: loadNgos, users: loadUsers, audit: loadAudit, leaderboard: loadLeaderboard, reports: loadReports })[state.tab]();
  }

  function setBadge(name, count) {
    const badge = document.querySelector(`[data-count-badge="${name}"]`);
    if (badge) badge.textContent = count ? String(count) : '';
  }

  function tile(icon, color, value, label, sub = '') {
    return `
      <div class="stat-metric-card">
        <div class="stat-icon-square" style="background: var(--accent-${color}-light); color: var(--accent-${color});"><i class="fas ${icon}"></i></div>
        <div><div class="stat-number">${e(value)}</div><div class="stat-label">${e(label)}</div>${sub ? `<div class="form-hint">${sub}</div>` : ''}</div>
      </div>`;
  }

  function table(headers, rows, empty) {
    return `
      <div class="data-table-container"><div class="table-scroll"><table class="custom-table">
        <thead><tr>${headers.map(h => `<th>${e(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${headers.length}" style="text-align: center; color: var(--text-muted);">${empty}</td></tr>`}</tbody>
      </table></div></div>`;
  }

  function filterChips(attr, current, options) {
    return `<div class="filter-chips">${options.map(([value, label]) =>
      `<button type="button" class="filter-chip ${current === value ? 'active' : ''}" ${attr}="${e(value)}">${e(label)}</button>`).join('')}</div>`;
  }

  function showError(message) {
    document.getElementById('adminTabContent').innerHTML = `<div class="dash-empty"><h2>Could not load this section</h2><p>${e(message || 'Please try again.')}</p></div>`;
  }

  /* ---------------- Overview ---------------- */
  async function loadOverview() {
    const res = await api('GET', '/api/admin/overview');
    if (!res) return;
    if (!res.ok) return showError(res.data.error);
    const d = res.data;
    setBadge('ngos', d.ngos.pending);
    setBadge('reports', d.reports.open);
    document.getElementById('adminTabContent').innerHTML = `
      <div class="stats-overview-grid admin-overview-grid">
        ${tile('fa-users', 'blue', d.users.total, 'Registered users', `${d.users.volunteers} volunteers • ${d.users.donors} donors • ${d.users.ngos} NGOs`)}
        ${tile('fa-building', 'green', d.ngos.total, 'Non-profit partners', `<strong style="color: var(--accent-green);">${d.ngos.verified} verified</strong> • <strong style="color: var(--accent-orange);">${d.ngos.pending} pending</strong>`)}
        ${tile('fa-hand-holding-heart', 'green', HC.formatINR(d.donations.pledgedAmount), 'Pledged (demo)', `${d.donations.pledgedCount} pledges • ${HC.formatINR(d.donations.paidAmount)} real payments`)}
        ${tile('fa-hands-helping', 'gold', `${d.volunteering.hours} hrs`, 'Verified volunteer hours', `${d.volunteering.activeVolunteers} volunteers with attended drives`)}
        ${tile('fa-bullhorn', 'orange', d.live.campaigns + d.live.drives, 'Live campaigns & drives', `${d.live.campaigns} campaigns • ${d.live.drives} drives`)}
        ${tile('fa-shield-alt', 'blue', d.audit.events, 'Audit events', `${d.reports.open} open content reports`)}
      </div>
      <div class="admin-shortcuts">
        <div class="admin-shortcut"><h3><i class="fas fa-clipboard-check" style="color: var(--accent-orange);"></i> Verification action required</h3>
          <p>${d.ngos.pending} NGO${d.ngos.pending === 1 ? '' : 's'} waiting for review.</p>
          <button type="button" class="btn btn-green btn-sm" data-goto="ngos"><i class="fas fa-arrow-right"></i> Open verification queue</button></div>
        <div class="admin-shortcut"><h3><i class="fas fa-history" style="color: var(--accent-blue);"></i> System activity & audit trail</h3>
          <p>Logins, sign-ups, verifications and admin actions.</p>
          <button type="button" class="btn btn-outline btn-sm" data-goto="audit"><i class="fas fa-search"></i> Inspect audit logs</button></div>
        <div class="admin-shortcut"><h3><i class="fas fa-trophy" style="color: var(--accent-gold-hover);"></i> Impact leaderboard</h3>
          <p>Top volunteers, donors and NGOs.</p>
          <button type="button" class="btn btn-outline btn-sm" data-goto="leaderboard"><i class="fas fa-medal"></i> View leaderboard</button></div>
      </div>`;
  }

  /* ---------------- NGO verification queue ---------------- */
  async function loadNgos() {
    const params = new URLSearchParams();
    if (state.ngos.status) params.set('status', state.ngos.status);
    if (state.ngos.search) params.set('search', state.ngos.search);
    const res = await api('GET', `/api/admin/ngos?${params}`);
    if (!res) return;
    if (!res.ok) return showError(res.data.error);
    const { ngos, counts } = res.data;
    setBadge('ngos', counts.pending);

    const rows = ngos.map(n => `
      <tr>
        <td><strong>${e(n.name)}</strong>
          <div class="form-hint">${n.submitter
            ? `<i class="fas fa-user"></i> ${e(n.submitter.name)} • ${e(n.submitter.email)} • +91 ${e(n.submitter.phone)}`
            : '<i class="fas fa-seedling"></i> Sample data'}</div></td>
        <td>${n.registrationNumber ? `<code class="reg-code">${e(n.registrationNumber)}</code>` : '<span class="form-hint">Not provided</span>'}</td>
        <td><strong>${e(n.category)}</strong><div class="form-hint"><i class="fas fa-map-marker-alt"></i> ${e(n.location)}</div></td>
        <td>${n.website ? `<a href="${HC.safeUrl(n.website)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Visit site</a>` : '<span class="form-hint">None provided</span>'}</td>
        <td>${ngoStatusPill(n.statusKey)}${n.statusReason ? `<div class="form-hint">${e(n.statusReason)}</div>` : ''}</td>
        <td><div class="table-actions">
          <button type="button" class="btn btn-xs btn-outline" data-ngo-details="${e(n.id)}"><i class="fas fa-eye"></i> Details</button>
          ${n.statusKey !== 'verified' ? `<button type="button" class="btn btn-xs btn-green" data-ngo-verify="${e(n.id)}"><i class="fas fa-check"></i> Verify</button>` : ''}
          ${n.statusKey !== 'rejected' ? `<button type="button" class="btn btn-xs btn-outline btn-danger-outline" data-ngo-reject="${e(n.id)}" data-name="${e(n.name)}"><i class="fas fa-ban"></i> Reject</button>` : ''}
        </div>
        <div class="ngo-details" id="ngo-details-${e(n.id)}" hidden>
          <p>${e(n.description)}</p>
          <p class="form-hint">Email: ${e(n.email)} • Founded: ${e(n.foundedYear || '—')} • Submitted: ${HC.formatDate(n.submittedAt)}</p>
        </div></td>
      </tr>`).join('');

    document.getElementById('adminTabContent').innerHTML = `
      <div class="admin-card">
        <h2><i class="fas fa-shield-alt" style="color: var(--accent-green);"></i> Non-profit verification & compliance queue</h2>
        <p>Review registration details and credentials, then approve or reject publishing privileges.</p>
        <div class="admin-toolbar">
          ${filterChips('data-ngo-filter', state.ngos.status, [['pending', `Pending review (${counts.pending})`], ['verified', `Verified (${counts.verified})`], ['rejected', `Rejected (${counts.rejected})`], ['', 'All records']])}
          <input type="search" class="form-control" id="ngoSearch" placeholder="Search organization..." value="${e(state.ngos.search)}" style="max-width: 260px;">
        </div>
        ${table(['Organization & submitter', 'Reg. number', 'Cause & city', 'Website', 'Status', 'Actions'], rows, 'Nothing here.')}
      </div>`;
    wireSearch('ngoSearch', v => { state.ngos.search = v; return loadNgos(); });
  }

  function ngoStatusPill(status) {
    return {
      verified: '<span class="badge-status-pill unlocked">Verified</span>',
      pending: '<span class="badge-status-pill pending">Pending</span>',
      rejected: '<span class="badge-status-pill closed">Rejected</span>'
    }[status] || e(status);
  }

  /* ---------------- Users ---------------- */
  async function loadUsers() {
    const params = new URLSearchParams({ page: String(state.users.page) });
    if (state.users.status) params.set('status', state.users.status);
    if (state.users.search) params.set('search', state.users.search);
    const res = await api('GET', `/api/admin/users?${params}`);
    if (!res) return;
    if (!res.ok) return showError(res.data.error);
    const d = res.data;
    const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
    const statusPill = {
      pending: '<span class="badge-status-pill pending">Pending</span>',
      approved: '<span class="badge-status-pill unlocked">Active</span>',
      rejected: '<span class="badge-status-pill closed">Rejected</span>',
      suspended: '<span class="badge-status-pill locked">Suspended</span>'
    };

    const rows = d.users.map(u => {
      const actions = u.status === 'approved'
        ? `<button type="button" class="btn btn-xs btn-outline btn-danger-outline" data-user-action="suspended" data-id="${e(u.id)}" data-name="${e(u.name)}"><i class="fas fa-user-slash"></i> Suspend</button>`
        : u.status === 'pending'
          ? `<button type="button" class="btn btn-xs btn-green" data-user-action="approved" data-id="${e(u.id)}" data-name="${e(u.name)}">Approve</button>
             <button type="button" class="btn btn-xs btn-outline" data-user-action="rejected" data-id="${e(u.id)}" data-name="${e(u.name)}">Reject</button>`
          : `<button type="button" class="btn btn-xs btn-outline" data-user-action="approved" data-id="${e(u.id)}" data-name="${e(u.name)}">Re-activate</button>`;
      return `
        <tr>
          <td><strong>${e(u.name)}</strong><div class="form-hint">${e(u.email)} • +91 ${e(u.phone)}</div></td>
          <td><strong class="role-tag">${e(ROLE_LABEL[u.role] || u.role)}</strong></td>
          <td>${u.emailVerified ? '<span class="badge-status-pill unlocked"><i class="fas fa-check"></i> Verified</span>' : '<span class="badge-status-pill pending">Not verified</span>'}</td>
          <td>${statusPill[u.status] || e(u.status)}${u.statusReason ? `<div class="form-hint">${e(u.statusReason)}</div>` : ''}</td>
          <td style="white-space: nowrap;">${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
          <td style="white-space: nowrap;">${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
          <td><div class="table-actions">${actions}</div></td>
        </tr>`;
    }).join('');

    const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
    document.getElementById('adminTabContent').innerHTML = `
      <div class="admin-card">
        <h2>User account management</h2>
        <p>View accounts, roles and email verification, and manage suspensions. (Suspending asks for your admin password again.)</p>
        <div class="admin-toolbar">
          ${filterChips('data-user-filter', state.users.status, [['', `All (${total})`], ['approved', `Active (${d.counts.approved})`], ['suspended', `Suspended (${d.counts.suspended})`], ['pending', `Pending (${d.counts.pending})`], ['rejected', `Rejected (${d.counts.rejected})`]])}
          <input type="search" class="form-control" id="userSearch" placeholder="Search name, email or mobile..." value="${e(state.users.search)}" style="max-width: 260px;">
        </div>
        ${table(['User', 'Role', 'Email', 'Status', 'Registered', 'Last login', 'Actions'], rows, 'No users here.')}
        ${pager(d.page, pages, d.total, 'users')}
      </div>`;
    wireSearch('userSearch', v => { state.users.search = v; state.users.page = 1; return loadUsers(); });
  }

  function pager(page, pages, total, kind) {
    return `
      <div class="admin-pagination">
        <span>${e(total)} total • page ${e(page)} of ${e(pages)}</span>
        <button type="button" class="btn btn-xs btn-outline" data-page="${kind}:${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
        <button type="button" class="btn btn-xs btn-outline" data-page="${kind}:${page + 1}" ${page >= pages ? 'disabled' : ''}>Next ›</button>
      </div>`;
  }

  /* ---------------- Audit logs ---------------- */
  function auditParams(includePage = true) {
    const params = new URLSearchParams();
    const a = state.audit;
    if (includePage) params.set('page', String(a.page));
    for (const k of ['search', 'action', 'from', 'to']) if (a[k]) params.set(k, a[k]);
    return params;
  }

  async function loadAudit() {
    const res = await api('GET', `/api/admin/audit-logs?${auditParams()}`);
    if (!res) return;
    if (!res.ok) return showError(res.data.error);
    const d = res.data;
    const pages = Math.max(1, Math.ceil(d.total / d.pageSize));
    const tone = a => (/FAILED|SUSPEND|REJECT|TAKEDOWN|LOGOUT|DELETED/.test(a) ? 'danger' : /SUCCESS|VERIFIED|CREATED|JOINED/.test(a) ? 'good' : 'info');

    const rows = d.logs.map(l => `
      <tr>
        <td style="white-space: nowrap;"><strong>${new Date(l.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
          <div class="form-hint">${new Date(l.timestamp).toLocaleTimeString('en-IN')}</div></td>
        <td><span class="audit-action ${tone(l.action)}">${e(l.action)}</span></td>
        <td><strong>${e(l.actorName || '—')}</strong><div class="form-hint">${e(l.actorRole)}</div></td>
        <td>${e(l.targetType || '—')}<div class="form-hint mono">${e(l.targetId ? l.targetId.slice(0, 10) + '…' : '')}</div></td>
        <td class="audit-details">${e(l.details)}</td>
        <td class="mono">${e(l.ip)}</td>
      </tr>`).join('');

    const a = state.audit;
    document.getElementById('adminTabContent').innerHTML = `
      <div class="admin-card">
        <div class="admin-card-head">
          <div><h2><i class="fas fa-history" style="color: var(--accent-blue);"></i> Platform security & system audit trail</h2>
            <p>Append-only log of sign-ups, logins, verifications, admin actions and content events.</p></div>
          <a class="btn btn-sm btn-outline" id="auditExport" href="${e(HC.API_BASE)}/api/admin/audit-logs/export?${auditParams(false)}" data-no-router download><i class="fas fa-file-csv"></i> Export CSV</a>
        </div>
        <form class="audit-filters" id="auditFilters">
          <input type="search" class="form-control" id="auditSearch" placeholder="Search actor, action, IP..." value="${e(a.search)}">
          <select class="form-control" id="auditAction"><option value="">All event types</option>${d.actions.map(x => `<option ${a.action === x ? 'selected' : ''}>${e(x)}</option>`).join('')}</select>
          <input type="date" class="form-control" id="auditFrom" value="${e(a.from)}" aria-label="From date">
          <input type="date" class="form-control" id="auditTo" value="${e(a.to)}" aria-label="To date">
          <button type="submit" class="btn btn-sm btn-green"><i class="fas fa-filter"></i> Filter</button>
          <button type="button" class="btn btn-sm btn-outline" id="auditReset">Reset</button>
        </form>
        ${table(['Timestamp', 'Action', 'Actor / user', 'Target', 'Details', 'IP address'], rows, 'No events match these filters.')}
        ${pager(d.page, pages, d.total, 'audit')}
      </div>`;

    document.getElementById('auditFilters').addEventListener('submit', (ev) => {
      ev.preventDefault();
      Object.assign(state.audit, {
        search: document.getElementById('auditSearch').value.trim(),
        action: document.getElementById('auditAction').value,
        from: document.getElementById('auditFrom').value,
        to: document.getElementById('auditTo').value,
        page: 1
      });
      loadAudit();
    });
    document.getElementById('auditReset').addEventListener('click', () => {
      state.audit = { search: '', action: '', from: '', to: '', page: 1 };
      loadAudit();
    });
  }

  /* ---------------- Leaderboard ---------------- */
  async function loadLeaderboard() {
    const res = await api('GET', `/api/admin/leaderboard?type=${state.board}`);
    if (!res) return;
    if (!res.ok) return showError(res.data.error);
    const medal = r => (r.rank <= 3 ? `<span class="rank-medal rank-${r.rank}">🏅 #${r.rank}</span>` : `#${r.rank}`);
    const tier = t => `<span class="tier tier-${e(t.toLowerCase())}">${e(t)}</span>`;
    const pts = r => `<strong style="color: var(--accent-blue);">${e(r.points)}</strong> pts`;
    const configs = {
      volunteers: {
        headers: ['Rank', 'Volunteer', 'Verified service', 'Drives attended', 'Impact points', 'Badge tier'],
        row: r => `<td>${medal(r)}</td><td><strong>${e(r.name)}</strong><div class="form-hint">${e(r.email)}</div></td><td><strong>${e(r.hours)}</strong> hrs</td><td>${e(r.events)}</td><td>${pts(r)}</td><td>${tier(r.tier)}</td>`
      },
      donors: {
        headers: ['Rank', 'Donor', 'Pledged (demo)', 'Campaigns supported', 'Impact points', 'Badge tier'],
        row: r => `<td>${medal(r)}</td><td><strong>${e(r.name)}</strong><div class="form-hint">${e(r.email)}</div></td><td><strong>${HC.formatINR(r.amount)}</strong></td><td>${e(r.campaignsSupported)}</td><td>${pts(r)}</td><td>${tier(r.tier)}</td>`
      },
      ngos: {
        headers: ['Rank', 'NGO', 'Volunteers attended', 'Hours delivered', 'Raised (demo)', 'Impact points', 'Badge tier'],
        row: r => `<td>${medal(r)}</td><td><strong>${e(r.name)}</strong><div class="form-hint">${e(r.location)} • ${e(r.category)}</div></td><td>${e(r.volunteers)}</td><td>${e(r.hours)} hrs</td><td>${HC.formatINR(r.raised)}</td><td>${pts(r)}</td><td>${tier(r.tier)}</td>`
      }
    };
    const cfg = configs[state.board];
    document.getElementById('adminTabContent').innerHTML = `
      <div class="admin-card">
        <div class="admin-card-head">
          <div><h2><i class="fas fa-trophy" style="color: var(--accent-gold-hover);"></i> Platform impact leaderboard</h2>
            <p>Volunteers: 10 pts per attended hour • Donors: 1 pt per ₹100 • NGOs: 10 pts per volunteer hour + 1 pt per ₹1,000.</p></div>
          ${filterChips('data-board', state.board, [['volunteers', '🙋 Volunteers'], ['donors', '❤️ Donors'], ['ngos', '🏢 NGOs']])}
        </div>
        ${table(cfg.headers, res.data.rows.map(r => `<tr>${cfg.row(r)}</tr>`).join(''), 'No one on the board yet.')}
      </div>`;
  }

  /* ---------------- Flagged content ---------------- */
  async function loadReports() {
    const res = await api('GET', `/api/admin/reports${state.reports ? `?status=${state.reports}` : ''}`);
    if (!res) return;
    if (!res.ok) return showError(res.data.error);
    const { reports, counts } = res.data;
    setBadge('reports', counts.open);
    const typeLabel = { ngo: 'NGO', campaign: 'Campaign', opportunity: 'Drive' };
    const rows = reports.map(r => `
      <tr>
        <td><strong>${e(r.targetName || '(deleted)')}</strong><div class="form-hint">${e(typeLabel[r.targetType] || r.targetType)}</div></td>
        <td><strong style="text-transform: capitalize;">${e(r.reason)}</strong><div class="form-hint">${e(r.details || '')}</div></td>
        <td>${r.reporter ? `${e(r.reporter.name)}<div class="form-hint">${e(r.reporter.email)}</div>` : '—'}</td>
        <td style="white-space: nowrap;">${new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        <td>${r.status === 'open'
          ? `<div class="table-actions">
               <button type="button" class="btn btn-xs btn-outline btn-danger-outline" data-report-action="takedown" data-id="${e(r.id)}" data-name="${e(r.targetName)}"><i class="fas fa-ban"></i> Take down</button>
               <button type="button" class="btn btn-xs btn-outline" data-report-action="dismiss" data-id="${e(r.id)}" data-name="${e(r.targetName)}">Dismiss</button>
             </div>`
          : `<span class="badge-status-pill ${r.status === 'actioned' ? 'closed' : 'locked'}">${r.status === 'actioned' ? 'Taken down' : 'Dismissed'}</span><div class="form-hint">${e(r.resolutionNote)}</div>`}</td>
      </tr>`).join('');

    document.getElementById('adminTabContent').innerHTML = `
      <div class="admin-card">
        <h2><i class="fas fa-flag" style="color: #C0392B;"></i> Flagged content</h2>
        <p>Reports from users about NGOs, campaigns and drives. "Take down" rejects the NGO or closes the campaign/drive.</p>
        <div class="admin-toolbar">
          ${filterChips('data-report-filter', state.reports, [['open', `Open (${counts.open})`], ['actioned', `Taken down (${counts.actioned})`], ['dismissed', `Dismissed (${counts.dismissed})`], ['', 'All']])}
        </div>
        ${table(['Reported item', 'Reason', 'Reported by', 'When', 'Action'], rows, 'No reports here. 🎉')}
      </div>`;
  }

  /* ==========================================================================
     Actions (one handler for the whole tab area)
     ========================================================================== */
  function wireSearch(id, onSearch) {
    let timer;
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const pos = input.selectionStart;
        await onSearch(input.value.trim());
        const again = document.getElementById(id);
        again?.focus();
        again?.setSelectionRange(pos, pos);
      }, 350);
    });
  }

  async function handleAction(ev) {
    const btn = ev.target.closest('button');
    if (!btn || btn.disabled) return;
    const d = btn.dataset;

    if (d.goto) return switchTab(d.goto);
    if (d.ngoFilter !== undefined) { state.ngos.status = d.ngoFilter; return loadNgos(); }
    if (d.userFilter !== undefined) { state.users.status = d.userFilter; state.users.page = 1; return loadUsers(); }
    if (d.reportFilter !== undefined) { state.reports = d.reportFilter; return loadReports(); }
    if (d.board) { state.board = d.board; return loadLeaderboard(); }
    if (d.page) {
      const [kind, page] = d.page.split(':');
      state[kind].page = Number(page);
      return kind === 'users' ? loadUsers() : loadAudit();
    }
    if (d.ngoDetails) {
      const box = document.getElementById(`ngo-details-${d.ngoDetails}`);
      box.hidden = !box.hidden;
      return;
    }
    if (d.ngoVerify) return runAction(btn, 'PATCH', `/api/admin/ngos/${encodeURIComponent(d.ngoVerify)}/status`, { status: 'verified' }, loadNgos);
    if (d.ngoReject) {
      return openReasonModal({
        title: `Reject ${d.name}?`, intro: 'The NGO will see this reason in their dashboard and can fix and resubmit.', button: 'Reject', needPassword: false,
        send: (reason) => HC.api('PATCH', `/api/admin/ngos/${encodeURIComponent(d.ngoReject)}/status`, { status: 'rejected', reason }), reload: loadNgos
      });
    }
    if (d.userAction === 'approved') return runAction(btn, 'PATCH', `/api/admin/users/${encodeURIComponent(d.id)}/status`, { status: 'approved' }, loadUsers);
    if (d.userAction) {
      const suspend = d.userAction === 'suspended';
      return openReasonModal({
        title: `${suspend ? 'Suspend' : 'Reject'} ${d.name}?`,
        intro: suspend ? 'They will be logged out on every device immediately and cannot log in until re-activated.' : 'They will not be able to log in.',
        button: suspend ? 'Suspend' : 'Reject', needPassword: true,
        send: (reason, adminPassword) => HC.api('PATCH', `/api/admin/users/${encodeURIComponent(d.id)}/status`, { status: d.userAction, reason, adminPassword }),
        reload: loadUsers
      });
    }
    if (d.reportAction) {
      const takedown = d.reportAction === 'takedown';
      return openReasonModal({
        title: takedown ? `Take down "${d.name}"?` : `Dismiss report about "${d.name}"?`,
        intro: takedown ? 'This rejects the NGO or closes the campaign/drive, and resolves all open reports about it.' : 'All open reports about this item will be marked as dismissed.',
        button: takedown ? 'Take down' : 'Dismiss', needPassword: false, optionalReason: !takedown,
        send: (note) => HC.api('PATCH', `/api/admin/reports/${encodeURIComponent(d.id)}`, { action: d.reportAction, note: note || undefined }),
        reload: loadReports
      });
    }
  }

  async function runAction(btn, method, path, body, reload) {
    HC.setLoading(btn, true, '...');
    const res = await api(method, path, body);
    if (!res) return;
    HC.setLoading(btn, false);
    if (!res.ok) return window.showToast(res.data.error || 'Action failed.', 'error', 'fas fa-exclamation-circle');
    window.showToast(res.data.message || 'Done.', 'success', 'fas fa-check');
    reload();
  }

  /* ---------------- Reason (+ password) modal ---------------- */
  function openReasonModal(action) {
    state.pendingAction = action;
    document.getElementById('reasonTitle').textContent = action.title;
    document.getElementById('reasonIntro').textContent = action.intro;
    document.getElementById('reasonSubmit').textContent = action.button;
    document.getElementById('reasonLabel').textContent = action.optionalReason ? 'Note (optional)' : 'Reason *';
    document.getElementById('reauthGroup').hidden = !action.needPassword;
    document.getElementById('reasonText').value = '';
    document.getElementById('reauthPassword').value = '';
    HC.clearFieldErrors(document.getElementById('reasonForm'));
    window.openModal('reasonModal');
  }

  function setupReasonModal() {
    const form = document.getElementById('reasonForm');
    const text = document.getElementById('reasonText');
    const pass = document.getElementById('reauthPassword');
    const submit = document.getElementById('reasonSubmit');

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const action = state.pendingAction;
      if (submit.disabled || !action) return;
      const rules = [];
      if (!action.optionalReason) rules.push({ input: text, checks: [v => (v.length >= 3 ? '' : 'Please give a short reason (at least 3 characters).')] });
      if (action.needPassword) rules.push({ input: pass, raw: true, checks: [v => (v ? '' : 'Enter your admin password.')] });
      if (rules.length && !HC.validateFields(rules)) return;

      HC.setLoading(submit, true, 'Working...');
      const res = await action.send(text.value.trim(), pass.value);
      HC.setLoading(submit, false);
      pass.value = '';
      if (sessionLost(res.status)) {
        window.closeModal('reasonModal');
        return;
      }
      if (!res.ok) {
        if (!HC.showServerErrors({ reason: text, adminPassword: pass, note: text }, res.data)) {
          window.showToast(res.data.error || 'Action failed.', 'error', 'fas fa-exclamation-circle');
        }
        return;
      }
      state.pendingAction = null;
      window.closeModal('reasonModal');
      window.showToast(res.data.message || 'Done.', 'success', 'fas fa-check');
      action.reload();
    });
  }
})();
