/**
 * HopeConnect AI - My Dashboard (pages/dashboard.html)
 * Shows a different dashboard depending on who is logged in:
 *   volunteer → my drives & hours        donor → my pledges
 *   ngo       → organization status, participants (who joined), drives, campaigns, supporters
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  const e = (v) => HC.escape(v);
  const ROLE_LABEL = { volunteer: 'Volunteer', donor: 'Donor', ngo: 'NGO / Organizer' };
  const state = { ngoTab: 'participants', driveFilter: 'all', participantSearch: '' };

  HC.ready(() => {
    if (!document.getElementById('dashboardPage')) return;
    fillCategorySelects();
    setupCreateForms();
    render();
    HC.onPage(document, 'hc:auth-changed', render);
  });

  /* ==========================================================================
     Shared bits
     ========================================================================== */
  function statTile(icon, color, value, label, note = '') {
    return `
      <div class="stat-metric-card">
        <div class="stat-icon-square" style="background: var(--accent-${color}-light); color: var(--accent-${color});"><i class="fas ${icon}"></i></div>
        <div>
          <div class="stat-number">${e(value)}</div>
          <div class="stat-label">${e(label)}</div>
          ${note ? `<div class="form-hint">${e(note)}</div>` : ''}
        </div>
      </div>`;
  }

  function tableCard(title, icon, headers, rowsHtml, emptyText, extraHeader = '') {
    return `
      <div class="data-table-container">
        <div class="data-table-header">
          <h3><i class="fas ${icon}" style="color: var(--accent-orange);"></i> ${e(title)}</h3>
          ${extraHeader}
        </div>
        <div class="table-scroll">
          <table class="custom-table">
            <thead><tr>${headers.map(h => `<th>${e(h)}</th>`).join('')}</tr></thead>
            <tbody>${rowsHtml || `<tr><td colspan="${headers.length}" style="text-align: center; color: var(--text-muted);">${emptyText}</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function renderProfile(profile) {
    const box = document.getElementById('dashProfile');
    if (profile.isDemo) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `
      <div class="dash-profile-main">
        <div class="dash-avatar">${e(profile.name.charAt(0).toUpperCase())}</div>
        <div>
          <h1 class="dash-name">${e(profile.name)} <span class="dash-role">${e(ROLE_LABEL[profile.role] || profile.role)}</span></h1>
          <div class="dash-meta">
            <span><i class="fas fa-envelope"></i> ${e(profile.email)}
              ${profile.emailVerified ? '<span class="badge-status-pill unlocked"><i class="fas fa-check"></i> Verified</span>' : '<span class="badge-status-pill pending">Not verified</span>'}</span>
            <span><i class="fas fa-phone"></i> +91 ${e(profile.phone)}</span>
          </div>
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-outline" data-auth="logout"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
  }

  async function render() {
    const profile = window.HCStore.getProfile();
    renderProfile(profile);
    const content = document.getElementById('dashContent');

    if (profile.isDemo) {
      content.innerHTML = `
        <div class="dash-empty">
          <div style="font-size: 2.6rem;">👋</div>
          <h2>Log in to see your dashboard</h2>
          <p>Volunteers see their drives and hours, donors their pledges, and NGOs their participants, drives and campaigns.</p>
          <div class="verify-actions">
            <button type="button" class="btn btn-primary" data-auth="login"><i class="fas fa-sign-in-alt"></i> Login</button>
            <button type="button" class="btn btn-outline" data-auth="signup"><i class="fas fa-user-plus"></i> Sign up</button>
          </div>
        </div>`;
      return;
    }

    if (profile.role === 'ngo') {
      content.innerHTML = '<div class="dash-loading"><i class="fas fa-spinner fa-spin"></i> Loading your organization...</div>';
      const result = await window.HCStore.loadNgoConsole();
      if (!result.success) {
        content.innerHTML = `<div class="dash-empty"><h2>Could not load your organization</h2><p>${e(result.error)}</p></div>`;
        return;
      }
      renderNgo(result.console);
      return;
    }
    renderMember(profile);
  }

  /* ==========================================================================
     Volunteer / donor
     ========================================================================== */
  function renderMember(profile) {
    const stats = window.HCStore.getUserStats();
    const badges = window.HCStore.getUserBadges().filter(b => b.unlocked).length;
    const regs = window.HCStore.getUserRegistrations();
    const pledges = window.HCStore.getUserDonations();
    const isDonor = profile.role === 'donor';
    const today = HC_DATE.todayISO();

    const tiles = isDonor
      ? [statTile('fa-hand-holding-heart', 'green', HC.formatINR(stats.totalContributed), 'Total pledged', 'Demo pledges, not charged'),
         statTile('fa-bullhorn', 'gold', stats.campaignsSupported, 'Campaigns supported'),
         statTile('fa-receipt', 'blue', stats.donationCount, 'Pledges made'),
         statTile('fa-award', 'orange', badges, 'Badges earned')]
      : [statTile('fa-calendar-check', 'blue', stats.eventsUpcoming, 'Upcoming drives'),
         statTile('fa-user-check', 'green', stats.eventsAttended, 'Drives attended'),
         statTile('fa-clock', 'gold', `${stats.volunteerHours} hrs`, 'Volunteer hours', stats.upcomingHours ? `+${stats.upcomingHours} hrs after upcoming drives` : 'Counted after the NGO confirms attendance'),
         statTile('fa-award', 'orange', badges, 'Badges earned')];

    const regRows = regs.map(r => `
      <tr>
        <td><strong>${e(r.opportunityTitle)}</strong><div class="form-hint">${e(r.ngoName)}</div></td>
        <td style="white-space: nowrap;">${HC.formatDate(r.eventDate)}</td>
        <td>${e(r.hours)} hrs</td>
        <td>${HC.statusPill(r.status)}</td>
        <td>${r.status === 'Registered' && (r.eventDate || '') >= today
          ? `<button type="button" class="btn btn-xs btn-outline" data-cancel="${e(r.id)}">Cancel</button>` : ''}</td>
      </tr>`).join('');

    const pledgeRows = pledges.map(p => `
      <tr>
        <td><strong>${e(p.campaignTitle)}</strong><div class="form-hint">${e(p.ngoName)}</div></td>
        <td style="white-space: nowrap;">${HC.formatDate(p.date)}</td>
        <td><strong style="color: var(--accent-green);">${HC.formatINR(p.amount)}</strong></td>
        <td><span class="demo-tag">${e(p.reference)}</span></td>
      </tr>`).join('');

    const drivesTable = tableCard('My volunteer drives', 'fa-hands-helping', ['Drive', 'Date', 'Hours', 'Status', ''], regRows,
      `No drives yet. <a href="${e(HC.page('volunteer.html'))}">Find a drive to join</a>.`,
      `<a href="${e(HC.page('volunteer.html'))}" class="btn btn-sm btn-outline">Find drives</a>`);
    const pledgesTable = tableCard('My pledges', 'fa-receipt', ['Campaign', 'Date', 'Amount', 'Reference'], pledgeRows,
      `No pledges yet. <a href="${e(HC.page('campaigns.html'))}">Support a campaign</a>.`,
      `<a href="${e(HC.page('campaigns.html'))}" class="btn btn-sm btn-outline">Browse campaigns</a>`);

    document.getElementById('dashContent').innerHTML = `
      ${profile.emailVerified ? '' : '<div class="demo-callout warning"><i class="fas fa-envelope"></i> Verify your email to join drives and support campaigns. Use <strong>Resend email</strong> in the banner above if you need a new link.</div>'}
      <div class="stats-overview-grid">${tiles.join('')}</div>
      ${isDonor ? pledgesTable + drivesTable : drivesTable + pledgesTable}
      <p class="form-hint" style="text-align: center;"><a href="${e(HC.page('impact.html'))}"><i class="fas fa-chart-line"></i> See your badges, charts and certificate on the Impact page</a></p>`;

    document.getElementById('dashContent').querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel your registration for this drive?')) return;
        HC.setLoading(btn, true, '...');
        const result = await window.HCStore.cancelRegistration(btn.dataset.cancel);
        if (!result.success) {
          HC.setLoading(btn, false);
          window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
          return;
        }
        window.showToast('Registration cancelled.', 'info', 'fas fa-calendar-times');
        renderMember(window.HCStore.getProfile());
      });
    });
  }

  /* ==========================================================================
     NGO
     ========================================================================== */
  function renderNgo(data) {
    const content = document.getElementById('dashContent');
    const ngo = data.ngo;

    if (!ngo || ngo.status === 'Rejected') {
      content.innerHTML = organizationForm(ngo);
      setupOrganizationForm(ngo);
      return;
    }

    if (!ngo.verified) {
      content.innerHTML = `
        <div class="dash-empty">
          <div style="font-size: 2.6rem;">⏳</div>
          <h2>${e(ngo.name)} is waiting for verification</h2>
          <p>An admin is reviewing your details (registration number, cause and location). Once verified, you can publish drives and campaigns here and see who joins.</p>
          <dl class="org-summary">
            <dt>Registration no.</dt><dd>${e(ngo.registrationNumber || '—')}</dd>
            <dt>Cause</dt><dd>${e(ngo.category)}</dd>
            <dt>Location</dt><dd>${e(ngo.location)}</dd>
            <dt>Submitted</dt><dd>${HC.formatDate(ngo.submittedAt)}</dd>
          </dl>
        </div>`;
      return;
    }

    const regs = data.registrations;
    const active = regs.filter(r => r.status !== 'Cancelled');
    const attended = regs.filter(r => r.status === 'Attended').length;
    const noShow = regs.filter(r => r.status === 'No-show').length;
    const pledged = data.pledges.reduce((s, p) => s + p.amount, 0);
    const liveDrives = data.opportunities.filter(o => window.HCStore.getOpportunityAvailability(o).ok).length;

    const tabs = [
      ['participants', 'fa-users', `Participants (${active.length})`],
      ['drives', 'fa-calendar-alt', `Drives (${data.opportunities.length})`],
      ['campaigns', 'fa-bullhorn', `Campaigns (${data.campaigns.length})`],
      ['supporters', 'fa-hand-holding-heart', `Supporters (${data.pledges.length})`]
    ];

    content.innerHTML = `
      <div class="dash-org-bar">
        <div><strong>${e(ngo.name)}</strong> <span class="badge-status-pill unlocked"><i class="fas fa-check-circle"></i> Verified</span>
          <div class="form-hint"><i class="fas fa-map-marker-alt"></i> ${e(ngo.location)} • ${e(ngo.category)}</div></div>
        <div class="table-actions">
          <button type="button" class="btn btn-sm btn-secondary" onclick="openModal('createOpportunityModal')"><i class="fas fa-calendar-plus"></i> New Drive</button>
          <button type="button" class="btn btn-sm btn-primary" onclick="openModal('createCampaignModal')"><i class="fas fa-plus"></i> New Campaign</button>
        </div>
      </div>
      <div class="stats-overview-grid">
        ${statTile('fa-calendar-alt', 'blue', liveDrives, 'Open drives')}
        ${statTile('fa-users', 'gold', active.length, 'Volunteers joined')}
        ${statTile('fa-user-check', 'green', attended + noShow ? `${Math.round((attended / (attended + noShow)) * 100)}%` : '—', 'Attendance rate')}
        ${statTile('fa-hand-holding-heart', 'orange', HC.formatINR(pledged), 'Pledged to you', 'Demo pledges, not charged')}
      </div>
      <div class="dash-tabs" role="tablist">
        ${tabs.map(([id, icon, label]) => `<button type="button" class="dash-tab ${state.ngoTab === id ? 'active' : ''}" data-tab="${id}"><i class="fas ${icon}"></i> ${e(label)}</button>`).join('')}
      </div>
      <div id="ngoTabContent"></div>`;

    content.querySelectorAll('.dash-tab').forEach(tab => tab.addEventListener('click', () => {
      state.ngoTab = tab.dataset.tab;
      content.querySelectorAll('.dash-tab').forEach(t => t.classList.toggle('active', t === tab));
      renderNgoTab(data);
    }));
    // One click handler for all action buttons in the tab area (attached once per render)
    document.getElementById('ngoTabContent').addEventListener('click', (ev) => handleNgoAction(ev, data));
    renderNgoTab(data);
  }

  function renderNgoTab(data) {
    const box = document.getElementById('ngoTabContent');
    if (state.ngoTab === 'participants') box.innerHTML = participantsHtml(data);
    if (state.ngoTab === 'drives') box.innerHTML = drivesHtml(data);
    if (state.ngoTab === 'campaigns') box.innerHTML = campaignsHtml(data);
    if (state.ngoTab === 'supporters') box.innerHTML = supportersHtml(data);
    wireNgoInputs(box, data);
  }

  function filteredParticipants(data) {
    const q = state.participantSearch.toLowerCase();
    return data.registrations.filter(r =>
      (state.driveFilter === 'all' || r.opportunityId === state.driveFilter) &&
      (!q || [r.name, r.email, r.phone, r.skills].join(' ').toLowerCase().includes(q)));
  }

  function participantsHtml(data) {
    const today = HC_DATE.todayISO();
    const rows = filteredParticipants(data).map(r => {
      const tooEarly = (r.eventDate || '') > today;
      const actions = ['Attended', 'No-show', 'Cancelled'].filter(s => s !== r.status).map(s =>
        `<button type="button" class="btn btn-xs btn-outline" data-reg-status="${s}" data-id="${e(r.id)}"
          ${s !== 'Cancelled' && tooEarly ? 'disabled title="Available on or after the event date"' : ''}>${s}</button>`).join('');
      return `
        <tr>
          <td><strong>${e(r.name)}</strong><div class="form-hint"><a href="mailto:${e(r.email)}">${e(r.email)}</a> • <a href="tel:+91${e(r.phone)}">+91 ${e(r.phone)}</a></div></td>
          <td>${e(r.opportunityTitle)}<div class="form-hint">${HC.formatDate(r.eventDate)} • ${e(r.hours)} hrs</div></td>
          <td>${e(r.skills || '—')}<div class="form-hint">${e(r.availability || '')}</div></td>
          <td style="white-space: nowrap;">${HC.formatDate(r.dateApplied)}</td>
          <td>${HC.statusPill(r.status)}</td>
          <td><div class="table-actions">${actions}</div></td>
        </tr>`;
    }).join('');

    const options = data.opportunities.map(o =>
      `<option value="${e(o.id)}" ${state.driveFilter === o.id ? 'selected' : ''}>${e(o.title)} (${HC.formatDate(o.date)})</option>`).join('');
    return `
      <div class="admin-toolbar">
        <select class="form-control" id="driveFilter" style="max-width: 320px;" aria-label="Filter by drive">
          <option value="all">All drives</option>${options}
        </select>
        <input type="search" class="form-control" id="participantSearch" placeholder="Search name, email, phone, skills..." value="${e(state.participantSearch)}" style="max-width: 280px;">
        <button type="button" class="btn btn-sm btn-outline" id="participantsCsv"><i class="fas fa-file-csv"></i> Download CSV</button>
      </div>
      ${tableCard('Who joined your drives', 'fa-users', ['Volunteer', 'Drive', 'Skills', 'Joined on', 'Status', 'Mark as'], rows,
        'No volunteers yet. Once people join your drives, they appear here.')}
      <p class="form-hint">Mark volunteers as <strong>Attended</strong> after the event: that adds the hours to their profile and the leaderboard.</p>`;
  }

  function drivesHtml(data) {
    const rows = data.opportunities.map(o => {
      const status = window.HCStore.getOpportunityAvailability(o);
      return `
        <tr>
          <td><strong>${e(o.title)}</strong><div class="form-hint">${e(o.location)} • ${e(o.hours)} hrs</div></td>
          <td style="white-space: nowrap;">${o.recurring ? `${e(o.recurring)}<br>` : ''}${HC.formatDate(o.date)}</td>
          <td>${e(o.volunteersRegistered)} / ${e(o.volunteersNeeded)}</td>
          <td>${status.ok ? '<span class="badge-status-pill unlocked">Open</span>' : `<span class="badge-status-pill closed">${e(status.reason)}</span>`}</td>
          <td><div class="table-actions">
            ${o.status === 'Closed'
              ? `<button type="button" class="btn btn-xs btn-outline" data-opp-status="open" data-id="${e(o.id)}">Reopen</button>`
              : `<button type="button" class="btn btn-xs btn-outline" data-opp-status="closed" data-id="${e(o.id)}">Close</button>`}
            <button type="button" class="btn btn-xs btn-outline" data-show-participants="${e(o.id)}">Participants</button>
            <button type="button" class="btn btn-xs btn-secondary" data-opp-delete="${e(o.id)}" aria-label="Delete drive"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>`;
    }).join('');
    return tableCard('Your volunteer drives', 'fa-calendar-alt', ['Drive', 'Date', 'Joined', 'Status', 'Actions'], rows,
      'No drives yet. Click <strong>New Drive</strong> to publish one.');
  }

  function campaignsHtml(data) {
    const rows = data.campaigns.map(c => {
      const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
      const open = window.HCStore.isCampaignOpen(c);
      return `
        <tr>
          <td><strong>${e(c.title)}</strong><div class="form-hint">${e(c.category)} • ${e(c.location)}</div></td>
          <td>${HC.formatINR(c.raised)} / ${HC.formatINR(c.goal)}</td>
          <td style="min-width: 120px;"><div class="progress-track" style="margin: 0 0 4px 0;"><div class="progress-bar" style="width: ${pct}%;"></div></div><span class="form-hint">${pct}% • ${e(c.supporters)} supporters</span></td>
          <td>${open ? `<span class="badge-status-pill unlocked">Active • ${window.HCStore.getDaysLeft(c)}d left</span>` : `<span class="badge-status-pill closed">${c.status === 'Closed' ? 'Closed' : 'Ended'}</span>`}</td>
          <td><div class="table-actions">
            ${c.status === 'Closed'
              ? `<button type="button" class="btn btn-xs btn-outline" data-camp-status="active" data-id="${e(c.id)}">Reopen</button>`
              : `<button type="button" class="btn btn-xs btn-outline" data-camp-status="closed" data-id="${e(c.id)}">Close</button>`}
            <button type="button" class="btn btn-xs btn-secondary" data-camp-delete="${e(c.id)}" aria-label="Delete campaign"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>`;
    }).join('');
    return tableCard('Your campaigns', 'fa-bullhorn', ['Campaign', 'Raised / Goal', 'Progress', 'Status', 'Actions'], rows,
      'No campaigns yet. Click <strong>New Campaign</strong> to start one.') +
      '<p class="form-hint">"Raised" includes demo pledges: no payment provider is connected yet, so no money is collected.</p>';
  }

  function supportersHtml(data) {
    const rows = data.pledges.map(p => `
      <tr>
        <td><strong>${e(p.donorName)}</strong><div class="form-hint">${e(p.donorEmail)}</div></td>
        <td>${e(p.campaignTitle)}</td>
        <td style="white-space: nowrap;">${HC.formatDate(p.date)}</td>
        <td><strong style="color: var(--accent-green);">${HC.formatINR(p.amount)}</strong></td>
        <td><span class="demo-tag">${e(p.reference)}</span></td>
      </tr>`).join('');
    return tableCard('People who pledged to your campaigns', 'fa-hand-holding-heart', ['Supporter', 'Campaign', 'Date', 'Amount', 'Reference'], rows,
      'No pledges yet.');
  }

  function downloadParticipantsCsv(data) {
    const cell = v => {
      let text = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // keep spreadsheet formulas from running
      return `"${text.replace(/"/g, '""')}"`;
    };
    const header = ['Name', 'Email', 'Phone', 'Drive', 'Event date', 'Hours', 'Skills', 'Availability', 'Joined on', 'Status'];
    const lines = filteredParticipants(data).map(r =>
      [r.name, r.email, r.phone, r.opportunityTitle, r.eventDate, r.hours, r.skills, r.availability, r.dateApplied, r.status].map(cell).join(','));
    const blob = new Blob(['﻿' + [header.map(cell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `participants-${HC_DATE.todayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Filters, search and CSV inside the participants tab (fresh elements on every render)
  function wireNgoInputs(box, data) {
    box.querySelector('#driveFilter')?.addEventListener('change', (ev) => {
      state.driveFilter = ev.target.value;
      renderNgoTab(data);
    });
    const search = box.querySelector('#participantSearch');
    search?.addEventListener('input', () => {
      state.participantSearch = search.value.trim();
      const pos = search.selectionStart;
      renderNgoTab(data);
      const again = document.getElementById('participantSearch');
      again.focus();
      again.setSelectionRange(pos, pos);
    });
    box.querySelector('#participantsCsv')?.addEventListener('click', () => downloadParticipantsCsv(data));
  }

  // Every action button in the NGO tabs goes through here; after a change the console reloads
  async function handleNgoAction(ev, data) {
    const after = async (result, message) => {
      if (!result.success) {
        window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
        return;
      }
      if (message) window.showToast(message, 'success', 'fas fa-check');
      renderNgo(window.HCStore.ngoConsole);
    };
    const btn = ev.target.closest('button');
    if (!btn || btn.disabled || btn.id === 'participantsCsv') return;
    const { id } = btn.dataset;
    const store = window.HCStore;

    if (btn.dataset.showParticipants) {
      state.ngoTab = 'participants';
      state.driveFilter = btn.dataset.showParticipants;
      renderNgo(data);
      return;
    }
    HC.setLoading(btn, true, '...');
    if (btn.dataset.regStatus) await after(await store.setRegistrationStatus(id, btn.dataset.regStatus.toLowerCase()), `Marked as ${btn.dataset.regStatus}.`);
    else if (btn.dataset.oppStatus) await after(await store.setOpportunityStatus(id, btn.dataset.oppStatus), 'Drive updated.');
    else if (btn.dataset.campStatus) await after(await store.setCampaignStatus(id, btn.dataset.campStatus), 'Campaign updated.');
    else if (btn.dataset.oppDelete && confirm('Delete this drive?')) await after(await store.deleteOpportunity(btn.dataset.oppDelete), 'Drive deleted.');
    else if (btn.dataset.campDelete && confirm('Delete this campaign?')) await after(await store.deleteCampaign(btn.dataset.campDelete), 'Campaign deleted.');
    if (btn.isConnected) HC.setLoading(btn, false);
  }

  /* ---------------- Organization registration ---------------- */
  function organizationForm(ngo) {
    const v = (key, fallback = '') => e(ngo?.[key] ?? fallback);
    const year = new Date().getFullYear();
    return `
      <div class="calc-card contact-form-card" style="max-width: 760px; margin: 0 auto;">
        <h2 style="font-size: 1.5rem; margin-bottom: 0.4rem;">${ngo ? 'Update and resubmit your organization' : 'Register your organization'}</h2>
        <p style="font-size: 0.92rem;">An admin checks these details before you can publish drives and campaigns.</p>
        ${ngo?.statusReason ? `<div class="form-alert error"><strong>Not approved:</strong> ${e(ngo.statusReason)}</div>` : ''}
        <form id="orgForm" novalidate>
          <div class="form-group">
            <label for="orgName">Organization name *</label>
            <input type="text" class="form-control" id="orgName" maxlength="80" value="${v('name')}" placeholder="e.g. Pune River Revitalization Trust">
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="orgCategory">Main cause *</label>
              <select class="form-control" id="orgCategory">${HC_CATEGORIES.map(c => `<option ${ngo?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
            </div>
            <div class="form-group">
              <label for="orgLocation">City, State *</label>
              <input type="text" class="form-control" id="orgLocation" maxlength="80" value="${v('location')}" placeholder="e.g. Pune, Maharashtra">
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="orgRegNumber">Registration number</label>
              <input type="text" class="form-control" id="orgRegNumber" maxlength="40" value="${v('registrationNumber')}" placeholder="e.g. MAH/PUN/2026/012">
            </div>
            <div class="form-group">
              <label for="orgYear">Year founded *</label>
              <input type="number" class="form-control" id="orgYear" inputmode="numeric" value="${v('foundedYear')}" placeholder="e.g. ${year - 5}">
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="orgEmail">Official email *</label>
              <input type="email" class="form-control" id="orgEmail" value="${v('email', window.HCStore.getProfile().email)}">
            </div>
            <div class="form-group">
              <label for="orgWebsite">Website</label>
              <input type="url" class="form-control" id="orgWebsite" value="${v('website')}" placeholder="https://your-ngo.org">
            </div>
          </div>
          <div class="form-group">
            <label for="orgDesc">Mission & programs *</label>
            <textarea class="form-control" id="orgDesc" rows="4" maxlength="600" placeholder="What does your organization do? (at least 40 characters)">${v('description')}</textarea>
          </div>
          <button type="submit" class="btn btn-green" style="width: 100%;"><i class="fas fa-paper-plane"></i> Submit for verification</button>
        </form>
      </div>`;
  }

  function setupOrganizationForm() {
    const form = document.getElementById('orgForm');
    const submit = form.querySelector('button[type="submit"]');
    const f = id => document.getElementById(id);
    const year = new Date().getFullYear();
    const { validators } = HC;

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (submit.disabled) return;
      const valid = HC.validateFields([
        { input: f('orgName'), checks: [v => validators.minLength(v, 3, 'Organization name')] },
        { input: f('orgLocation'), checks: [v => validators.minLength(v, 3, 'Location')] },
        { input: f('orgYear'), checks: [v => (Number.isInteger(Number(v)) && v >= 1850 && v <= year ? '' : `Enter a year between 1850 and ${year}.`)] },
        { input: f('orgEmail'), checks: [validators.email] },
        { input: f('orgWebsite'), checks: [v => (!v || /^https?:\/\/[^\s.]+\.\S{2,}$/i.test(v) ? '' : 'Enter a full URL starting with https://')] },
        { input: f('orgDesc'), checks: [v => validators.minLength(v, 40, 'Description')] }
      ]);
      if (!valid) return;

      HC.setLoading(submit, true, 'Submitting...');
      const result = await window.HCStore.submitOrganization({
        name: f('orgName').value.trim(),
        category: f('orgCategory').value,
        location: f('orgLocation').value.trim(),
        registrationNumber: f('orgRegNumber').value.trim(),
        foundedYear: Number(f('orgYear').value),
        email: f('orgEmail').value.trim(),
        website: f('orgWebsite').value.trim(),
        description: f('orgDesc').value.trim()
      });
      HC.setLoading(submit, false);
      if (!result.success) {
        const map = { name: f('orgName'), location: f('orgLocation'), foundedYear: f('orgYear'), email: f('orgEmail'), website: f('orgWebsite'), description: f('orgDesc'), registrationNumber: f('orgRegNumber') };
        if (!HC.showServerErrors(map, result)) window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
        return;
      }
      window.showToast('Submitted! An admin will review your organization.', 'success', 'fas fa-paper-plane');
      renderNgo(window.HCStore.ngoConsole);
    });
  }

  /* ---------------- New drive / new campaign modals ---------------- */
  function fillCategorySelects() {
    document.querySelectorAll('.hc-category-select').forEach(select => {
      select.innerHTML = HC_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    });
  }

  function setupCreateForms() {
    const { validators } = HC;
    const { todayISO, isoDaysFromToday } = HC_DATE;
    const f = id => document.getElementById(id);
    const intBetween = (min, max, label) => v => (Number.isInteger(Number(v)) && v >= min && v <= max ? '' : `${label} must be between ${min} and ${max}.`);

    // Campaign
    const campForm = f('createCampaignForm');
    const campSubmit = campForm.querySelector('button[type="submit"]');
    f('newCampEndDate').min = isoDaysFromToday(1);
    f('newCampEndDate').value = isoDaysFromToday(30);
    campForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (campSubmit.disabled) return;
      const valid = HC.validateFields([
        { input: f('newCampTitle'), checks: [v => validators.minLength(v, 8, 'Title')] },
        { input: f('newCampGoal'), checks: [intBetween(1000, 10000000, 'Goal (₹)')] },
        { input: f('newCampLocation'), checks: [v => validators.minLength(v, 3, 'Location')] },
        { input: f('newCampEndDate'), checks: [v => (v && v > todayISO() ? '' : 'Pick a future end date.')] },
        { input: f('newCampImage'), checks: [v => (!v || /^https:\/\/\S+$/i.test(v) ? '' : 'Image URL must start with https://')] },
        { input: f('newCampDescription'), checks: [v => validators.minLength(v, 30, 'Description')] }
      ]);
      if (!valid) return;
      HC.setLoading(campSubmit, true, 'Publishing...');
      const result = await window.HCStore.createCampaign({
        title: f('newCampTitle').value.trim(), category: f('newCampCategory').value, goal: Number(f('newCampGoal').value),
        location: f('newCampLocation').value.trim(), endDate: f('newCampEndDate').value, image: f('newCampImage').value.trim(),
        description: f('newCampDescription').value.trim()
      });
      HC.setLoading(campSubmit, false);
      if (!result.success) {
        if (!HC.showServerErrors({ title: f('newCampTitle'), goal: f('newCampGoal'), location: f('newCampLocation'), endDate: f('newCampEndDate'), image: f('newCampImage'), description: f('newCampDescription') }, result)) {
          window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
        }
        return;
      }
      campForm.reset();
      f('newCampEndDate').value = isoDaysFromToday(30);
      window.closeModal('createCampaignModal');
      window.showToast('Campaign published. It now appears on the Campaigns page.', 'success', 'fas fa-bullhorn');
      state.ngoTab = 'campaigns';
      renderNgo(window.HCStore.ngoConsole);
    });

    // Drive
    const oppForm = f('createOpportunityForm');
    const oppSubmit = oppForm.querySelector('button[type="submit"]');
    f('newOppDate').min = todayISO();
    f('newOppDate').value = isoDaysFromToday(7);
    oppForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (oppSubmit.disabled) return;
      const valid = HC.validateFields([
        { input: f('newOppTitle'), checks: [v => validators.minLength(v, 6, 'Title')] },
        { input: f('newOppDate'), checks: [v => (v && v >= todayISO() ? '' : 'Pick today or a future date.')] },
        { input: f('newOppCity'), checks: [v => validators.minLength(v, 2, 'City')] },
        { input: f('newOppNeeded'), checks: [intBetween(1, 500, 'Volunteers needed')] },
        { input: f('newOppHours'), checks: [intBetween(1, 12, 'Hours')] },
        { input: f('newOppDescription'), checks: [v => validators.minLength(v, 30, 'Description')] }
      ]);
      if (!valid) return;
      HC.setLoading(oppSubmit, true, 'Publishing...');
      const result = await window.HCStore.createOpportunity({
        title: f('newOppTitle').value.trim(), category: f('newOppCategory').value, date: f('newOppDate').value,
        city: f('newOppCity').value.trim(), venue: f('newOppVenue').value.trim(),
        volunteersNeeded: Number(f('newOppNeeded').value), hours: Number(f('newOppHours').value),
        availability: f('newOppAvailability').value,
        skills: f('newOppSkills').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 10),
        remote: f('newOppRemote').checked, description: f('newOppDescription').value.trim()
      });
      HC.setLoading(oppSubmit, false);
      if (!result.success) {
        if (!HC.showServerErrors({ title: f('newOppTitle'), date: f('newOppDate'), city: f('newOppCity'), volunteersNeeded: f('newOppNeeded'), hours: f('newOppHours'), description: f('newOppDescription') }, result)) {
          window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
        }
        return;
      }
      oppForm.reset();
      f('newOppDate').value = isoDaysFromToday(7);
      window.closeModal('createOpportunityModal');
      window.showToast('Drive published. Volunteers can now join it.', 'success', 'fas fa-calendar-check');
      state.ngoTab = 'drives';
      renderNgo(window.HCStore.ngoConsole);
    });
  }
})();
