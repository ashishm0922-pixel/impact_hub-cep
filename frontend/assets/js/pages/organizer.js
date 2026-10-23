/**
 * HopeConnect AI - Organizer Portal (pages/dashboard.html)
 * Create/close/delete campaigns and volunteer drives, mark attendance,
 * and review demo donations for the NGO you are "acting as".
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  HC.ready(() => {
    if (document.getElementById('organizerDashboard')) initOrganizerDashboard();
  });

  function currentOrg() {
    return window.HCStore.getNGOById(window.HCStore.getOrganizerNgoId()) || window.HCStore.getNGOs()[0];
  }

  function initOrganizerDashboard() {
    fillCategorySelects();
    setupOrgSwitcher();
    setupPortalMenu();
    setupOrganizerActions();
    initCampaignCreationForm();
    initOpportunityCreationForm();
    renderOrganizerDashboard();
  }

  function renderOrganizerDashboard() {
    const org = currentOrg();
    document.getElementById('orgNameLabel').textContent = org.name;
    document.getElementById('orgLocationLabel').textContent = org.location;
    renderOrganizerMetrics();
    renderOrganizerCampaignsTable();
    renderOrganizerOpportunitiesTable();
    renderOrganizerVolunteersTable();
    renderOrganizerDonationsTable();
  }

  function fillCategorySelects() {
    document.querySelectorAll('.hc-category-select').forEach(select => {
      select.innerHTML = window.HC_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    });
  }

  function setupOrgSwitcher() {
    const select = document.getElementById('orgSwitcher');
    select.innerHTML = window.HCStore.getNGOs()
      .map(n => `<option value="${window.HC.escape(n.id)}">${window.HC.escape(n.name)}${n.verified ? '' : ' (pending)'}</option>`)
      .join('');
    select.value = currentOrg().id;
    select.addEventListener('change', () => {
      window.HCStore.setOrganizerNgoId(select.value);
      renderOrganizerDashboard();
      window.showToast(`Now managing ${currentOrg().name} (demo)`, 'info', 'fas fa-building');
    });
  }

  // Highlight the sidebar link for the section you clicked
  function setupPortalMenu() {
    const links = document.querySelectorAll('.portal-menu a');
    links.forEach(link => link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }));
  }

  function orgData() {
    const orgId = currentOrg().id;
    const campaigns = window.HCStore.getCampaigns().filter(c => c.ngoId === orgId);
    const opportunities = window.HCStore.getOpportunities().filter(o => o.ngoId === orgId);
    const registrations = window.HCStore.getAllRegistrations().filter(r => r.ngoId === orgId);
    const donations = window.HCStore.getAllDonations().filter(d => d.ngoId === orgId);
    return { campaigns, opportunities, registrations, donations };
  }

  function renderOrganizerMetrics() {
    const { campaigns, registrations } = orgData();
    const active = campaigns.filter(c => window.HCStore.isCampaignOpen(c)).length;
    const signups = registrations.filter(r => r.status !== 'Cancelled').length;
    const raised = campaigns.reduce((sum, c) => sum + (c.raised || 0), 0);
    const attended = registrations.filter(r => r.status === 'Attended').length;
    const noShow = registrations.filter(r => r.status === 'No-show').length;

    document.getElementById('orgActiveCampaigns').textContent = active;
    document.getElementById('orgRegisteredVolunteers').textContent = signups;
    document.getElementById('orgFundsRaised').textContent = window.HC.formatINR(raised);
    document.getElementById('orgAttendanceRate').textContent =
      attended + noShow ? `${Math.round((attended / (attended + noShow)) * 100)}%` : '—';
  }

  function emptyRow(cols, text) {
    return `<tr><td colspan="${cols}" style="text-align: center; color: var(--text-muted);">${text}</td></tr>`;
  }

  function renderOrganizerCampaignsTable() {
    const tbody = document.getElementById('orgCampaignsTableBody');
    const { escape: e, formatINR } = window.HC;
    const { campaigns } = orgData();

    tbody.innerHTML = campaigns.length === 0 ? emptyRow(5, 'No campaigns yet. Create your first one!') : campaigns.map(c => {
      const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
      const open = window.HCStore.isCampaignOpen(c);
      const daysLeft = window.HCStore.getDaysLeft(c);
      return `
        <tr>
          <td>
            <strong>${e(c.title)}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${e(c.category)} • ${e(c.location)}</div>
          </td>
          <td>${formatINR(c.raised)} / ${formatINR(c.goal)}</td>
          <td style="min-width: 120px;">
            <div class="progress-track" style="margin: 0 0 4px 0;"><div class="progress-bar" style="width: ${pct}%;"></div></div>
            <span style="font-size: 0.78rem; font-weight: 600;">${pct}%</span>
          </td>
          <td>${open
            ? `<span class="badge-status-pill unlocked">Active • ${daysLeft}d left</span>`
            : `<span class="badge-status-pill closed">${c.status === 'Closed' ? 'Closed' : 'Ended'}</span>`}</td>
          <td>
            <div class="table-actions">
              ${c.status === 'Closed'
                ? `<button class="btn btn-xs btn-outline" data-action="reopen-campaign" data-id="${e(c.id)}">Reopen</button>`
                : `<button class="btn btn-xs btn-outline" data-action="close-campaign" data-id="${e(c.id)}">Close</button>`}
              <button class="btn btn-xs btn-secondary" data-action="delete-campaign" data-id="${e(c.id)}" aria-label="Delete campaign"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderOrganizerOpportunitiesTable() {
    const tbody = document.getElementById('orgOpportunitiesTableBody');
    const { escape: e, formatDate } = window.HC;
    const { opportunities } = orgData();

    tbody.innerHTML = opportunities.length === 0 ? emptyRow(5, 'No volunteer drives yet.') : opportunities.map(o => {
      const status = window.HCStore.getOpportunityAvailability(o);
      return `
        <tr>
          <td><strong>${e(o.title)}</strong><div style="font-size: 0.8rem; color: var(--text-muted);">${e(o.location)} • ${e(o.hours)} hrs</div></td>
          <td>${o.recurring ? e(o.recurring) + '<br>' : ''}${formatDate(o.date)}</td>
          <td>${e(o.volunteersRegistered || 0)} / ${e(o.volunteersNeeded)}</td>
          <td>${status.ok ? '<span class="badge-status-pill unlocked">Open</span>' : `<span class="badge-status-pill closed">${e(status.reason)}</span>`}</td>
          <td>
            <div class="table-actions">
              ${o.status === 'Closed'
                ? `<button class="btn btn-xs btn-outline" data-action="reopen-opp" data-id="${e(o.id)}">Reopen</button>`
                : `<button class="btn btn-xs btn-outline" data-action="close-opp" data-id="${e(o.id)}">Close</button>`}
              <button class="btn btn-xs btn-secondary" data-action="delete-opp" data-id="${e(o.id)}" aria-label="Delete drive"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderOrganizerVolunteersTable() {
    const tbody = document.getElementById('orgVolunteersTableBody');
    const { escape: e } = window.HC;
    const { registrations } = orgData();

    tbody.innerHTML = registrations.length === 0 ? emptyRow(5, 'No volunteer sign-ups yet.') : registrations.map(v => `
      <tr>
        <td><strong>${e(v.name)}</strong><div style="font-size: 0.8rem; color: var(--text-muted);">${e(v.email)} • ${e(v.phone)}</div></td>
        <td>${e(v.opportunityTitle)}<div style="font-size: 0.78rem; color: var(--text-muted);">${window.HC.formatDate(v.eventDate)}</div></td>
        <td>${e(v.skills || '—')}</td>
        <td>${window.HC.statusPill(v.status)}</td>
        <td>
          <div class="table-actions">
            ${['Attended', 'No-show', 'Cancelled'].filter(s => s !== v.status).map(s => {
              const tooEarly = s !== 'Cancelled' && v.eventDate > window.HC_DATE.todayISO();
              return `<button class="btn btn-xs btn-outline" data-action="set-status" data-status="${s}" data-id="${e(v.id)}"
                ${tooEarly ? 'disabled title="Available on or after the event date"' : ''}>${s}</button>`;
            }).join('')}
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderOrganizerDonationsTable() {
    const tbody = document.getElementById('orgDonationsTableBody');
    const { escape: e, formatDate, formatINR } = window.HC;
    const { donations } = orgData();

    tbody.innerHTML = donations.length === 0 ? emptyRow(5, 'No donations recorded in this browser yet.') : donations.slice(0, 20).map(d => `
      <tr>
        <td><strong>${e(d.donorName)}</strong></td>
        <td>${e(d.campaignTitle)}</td>
        <td>${formatDate(d.date)}</td>
        <td><strong style="color: var(--accent-green);">${formatINR(d.amount)}</strong></td>
        <td><span class="demo-tag">${e(d.reference)}</span></td>
      </tr>
    `).join('');
  }

  // One click listener handles every action button in the portal tables
  function setupOrganizerActions() {
    document.querySelector('.portal-content-area').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, status } = btn.dataset;
      const store = window.HCStore;

      switch (action) {
        case 'close-campaign': store.updateCampaign(id, { status: 'Closed' }); break;
        case 'reopen-campaign': store.updateCampaign(id, { status: 'Active' }); break;
        case 'delete-campaign':
          if (!confirm('Delete this campaign? Demo donations already recorded stay in donor history.')) return;
          store.deleteCampaign(id);
          break;
        case 'close-opp': store.updateOpportunity(id, { status: 'Closed' }); break;
        case 'reopen-opp': store.updateOpportunity(id, { status: 'Open' }); break;
        case 'delete-opp':
          if (!confirm('Delete this volunteer drive? Existing sign-ups stay in volunteer history.')) return;
          store.deleteOpportunity(id);
          break;
        case 'set-status': {
          const result = store.setRegistrationStatus(id, status);
          if (!result.success) {
            window.showToast(result.error, 'error', 'fas fa-calendar-times');
            return;
          }
          window.showToast(`Volunteer marked as ${status}.`, 'success', 'fas fa-user-check');
          break;
        }
        default: return;
      }
      renderOrganizerDashboard();
    });
  }

  function initCampaignCreationForm() {
    const form = document.getElementById('createCampaignForm');
    const endDateInput = document.getElementById('newCampEndDate');
    const { validators } = window.HC;
    const { todayISO, isoDaysFromToday } = window.HC_DATE;

    endDateInput.min = isoDaysFromToday(1);
    endDateInput.value = isoDaysFromToday(30);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('newCampTitle');
      const goal = document.getElementById('newCampGoal');
      const location = document.getElementById('newCampLocation');
      const image = document.getElementById('newCampImage');
      const description = document.getElementById('newCampDescription');

      const valid = window.HC.validateFields([
        { input: title, checks: [v => validators.minLength(v, 8, 'Title')] },
        { input: goal, checks: [v => {
          const n = Number(v);
          return Number.isInteger(n) && n >= 1000 && n <= 10000000 ? '' : 'Goal must be a whole number between ₹1,000 and ₹1,00,00,000.';
        }] },
        { input: location, checks: [v => validators.minLength(v, 3, 'Location')] },
        { input: endDateInput, checks: [v => (v && v > todayISO() ? '' : 'Pick a future end date.')] },
        { input: image, checks: [v => (!v || /^https:\/\/\S+$/i.test(v) ? '' : 'Image URL must start with https://')] },
        { input: description, checks: [v => validators.minLength(v, 30, 'Description')] }
      ]);
      if (!valid) return;

      const org = currentOrg();
      const campaign = window.HCStore.addCampaign({
        title: title.value.trim(),
        category: document.getElementById('newCampCategory').value,
        goal: Number(goal.value),
        location: location.value.trim(),
        endDate: endDateInput.value,
        description: description.value.trim(),
        image: image.value.trim() || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
        ngoId: org.id,
        ngoName: org.name
      });

      window.showToast(`Campaign "${campaign.title}" published. It now appears on the Campaigns page.`, 'success', 'fas fa-bullhorn');
      form.reset();
      endDateInput.value = isoDaysFromToday(30);
      window.closeModal('createCampaignModal');
      renderOrganizerDashboard();
    });
  }

  function initOpportunityCreationForm() {
    const form = document.getElementById('createOpportunityForm');
    const dateInput = document.getElementById('newOppDate');
    const { validators } = window.HC;
    const { todayISO, isoDaysFromToday } = window.HC_DATE;

    dateInput.min = todayISO();
    dateInput.value = isoDaysFromToday(7);

    const intBetween = (min, max, label) => v => {
      const n = Number(v);
      return Number.isInteger(n) && n >= min && n <= max ? '' : `${label} must be between ${min} and ${max}.`;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('newOppTitle');
      const city = document.getElementById('newOppCity');
      const venue = document.getElementById('newOppVenue');
      const needed = document.getElementById('newOppNeeded');
      const hours = document.getElementById('newOppHours');
      const skills = document.getElementById('newOppSkills');
      const description = document.getElementById('newOppDescription');

      const valid = window.HC.validateFields([
        { input: title, checks: [v => validators.minLength(v, 6, 'Title')] },
        { input: dateInput, checks: [v => (v && v >= todayISO() ? '' : 'Pick today or a future date.')] },
        { input: city, checks: [v => validators.minLength(v, 2, 'City')] },
        { input: needed, checks: [intBetween(1, 500, 'Volunteers needed')] },
        { input: hours, checks: [intBetween(1, 12, 'Hours')] },
        { input: description, checks: [v => validators.minLength(v, 30, 'Description')] }
      ]);
      if (!valid) return;

      const org = currentOrg();
      const cityName = city.value.trim();
      const opp = window.HCStore.addOpportunity({
        title: title.value.trim(),
        ngoId: org.id,
        ngoName: org.name,
        category: document.getElementById('newOppCategory').value,
        city: cityName,
        location: venue.value.trim() ? `${cityName} (${venue.value.trim()})` : cityName,
        date: dateInput.value,
        availability: document.getElementById('newOppAvailability').value,
        hours: Number(hours.value),
        volunteersNeeded: Number(needed.value),
        skillLevel: 'Open for all',
        skills: skills.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        remote: document.getElementById('newOppRemote').checked,
        image: org.banner || 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&auto=format&fit=crop&q=80',
        description: description.value.trim()
      });

      window.showToast(`Drive "${opp.title}" published. Volunteers can now join it.`, 'success', 'fas fa-calendar-check');
      form.reset();
      dateInput.value = isoDaysFromToday(7);
      window.closeModal('createOpportunityModal');
      renderOrganizerDashboard();
    });
  }
})();
