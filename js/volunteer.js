/**
 * HopeConnect AI - Volunteer Opportunities page
 * Search, filters and the registration form.
 */

const oppFilters = {
  category: 'all',
  search: '',
  availability: 'all',
  openOnly: true
};

document.addEventListener('DOMContentLoaded', () => {
  // Allow links like volunteer.html?category=Education or ?opp=opp-2
  const params = new URLSearchParams(window.location.search);
  if (params.get('category')) oppFilters.category = params.get('category');

  setupOpportunityFilters();
  setupRegistrationForm();
  renderOpportunities();

  if (params.get('opp')) openJoinModal(params.get('opp'));
});

function matchesOpportunityFilters(opp) {
  const { category, search, availability, openOnly } = oppFilters;
  if (category !== 'all' && opp.category !== category) return false;
  if (availability !== 'all' && opp.availability !== availability && opp.availability !== 'Flexible') return false;
  if (openOnly && !window.HCStore.getOpportunityAvailability(opp).ok) return false;

  if (search) {
    const haystack = [opp.title, opp.ngoName, opp.location, opp.skillLevel, opp.description, ...(opp.skills || [])]
      .join(' ')
      .toLowerCase();
    // Every word typed must appear somewhere (so "pune tree" works)
    return search.toLowerCase().split(/\s+/).every(word => haystack.includes(word));
  }
  return true;
}

function renderOpportunities() {
  const grid = document.getElementById('opportunitiesGrid');
  const countEl = document.getElementById('oppResultCount');
  const all = window.HCStore.getOpportunities();
  const filtered = all.filter(matchesOpportunityFilters);

  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${all.length} opportunities`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
        <i class="fas fa-calendar-times" style="font-size: 3rem; color: var(--border-light); margin-bottom: 1rem;"></i>
        <h3>No Opportunities Found</h3>
        <p>Try a different keyword, cause or availability — or untick “only open spots”.</p>
      </div>
    `;
    return;
  }

  const e = window.HC.escape;
  grid.innerHTML = filtered.map(opp => {
    const status = window.HCStore.getOpportunityAvailability(opp);
    const spotsLeft = Math.max(0, opp.volunteersNeeded - (opp.volunteersRegistered || 0));
    const when = opp.recurring
      ? `${e(opp.recurring)} (next: ${window.HC.formatDate(opp.date)})`
      : window.HC.formatDate(opp.date);

    return `
      <div class="opp-card">
        <div class="opp-img-wrap">
          <img src="${window.HC.safeUrl(opp.image)}" alt="${e(opp.title)}" loading="lazy">
          <span class="opp-category-tag">${e(opp.category)}</span>
        </div>
        <div class="opp-body">
          <div>
            <div class="opp-ngo-name"><i class="fas fa-building"></i> ${e(opp.ngoName)}</div>
            <h3 class="opp-title">${e(opp.title)}</h3>

            <div class="opp-details-grid">
              <div class="opp-detail-item"><i class="fas fa-map-marker-alt"></i><span>${e(opp.location)}${opp.remote ? ' • Remote OK' : ''}</span></div>
              <div class="opp-detail-item"><i class="fas fa-calendar-alt"></i><span>${when}</span></div>
              <div class="opp-detail-item"><i class="fas fa-users"></i><span>${spotsLeft} of ${e(opp.volunteersNeeded)} spots left</span></div>
              <div class="opp-detail-item"><i class="fas fa-clock"></i><span>${e(opp.hours || 4)} hrs • ${e(opp.availability || 'Flexible')}</span></div>
            </div>

            <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">${e(opp.description)}</p>
          </div>

          ${status.ok
            ? `<button class="btn btn-primary" style="width: 100%;" data-join="${e(opp.id)}"><i class="fas fa-user-plus"></i> Join Opportunity</button>`
            : `<button class="btn btn-secondary" style="width: 100%;" disabled><i class="fas fa-ban"></i> ${e(status.reason)}</button>`}
        </div>
      </div>
    `;
  }).join('');
}

function setupOpportunityFilters() {
  const searchInput = document.getElementById('oppSearchInput');
  const chips = document.querySelectorAll('#oppFilterChips .filter-chip');
  const availabilitySelect = document.getElementById('oppAvailabilityFilter');
  const openOnlyBox = document.getElementById('oppOpenOnly');
  const grid = document.getElementById('opportunitiesGrid');

  searchInput?.addEventListener('input', (e) => {
    oppFilters.search = e.target.value.trim();
    renderOpportunities();
  });

  chips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === oppFilters.category);
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      oppFilters.category = chip.dataset.category;
      renderOpportunities();
    });
  });

  availabilitySelect?.addEventListener('change', (e) => {
    oppFilters.availability = e.target.value;
    renderOpportunities();
  });

  openOnlyBox?.addEventListener('change', (e) => {
    oppFilters.openOnly = e.target.checked;
    renderOpportunities();
  });

  // One click handler for all "Join" buttons (event delegation)
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-join]');
    if (btn) openJoinModal(btn.dataset.join);
  });
}

function openJoinModal(oppId) {
  const opp = window.HCStore.getOpportunityById(oppId);
  if (!opp) return;

  const status = window.HCStore.getOpportunityAvailability(opp);
  if (!status.ok) {
    window.showToast(`Registration closed: ${status.reason}.`, 'error', 'fas fa-ban');
    return;
  }

  const form = document.getElementById('volunteerRegForm');
  window.HC.clearFieldErrors(form);

  // Pre-fill from the demo profile
  const profile = window.HCStore.getProfile();
  document.getElementById('regName').value = profile.name || '';
  document.getElementById('regEmail').value = profile.email || '';

  document.getElementById('regOppId').value = opp.id;
  document.getElementById('modalOppTitle').textContent = opp.title;
  document.getElementById('modalOppNgo').textContent = `Organized by: ${opp.ngoName}`;
  window.openModal('volunteerModal');
}
window.openJoinModal = openJoinModal;

function setupRegistrationForm() {
  const form = document.getElementById('volunteerRegForm');
  if (!form) return;
  const { validators } = window.HC;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    const skillsInput = document.getElementById('regSkills');

    const valid = window.HC.validateFields([
      { input: nameInput, checks: [validators.name] },
      { input: emailInput, checks: [validators.email] },
      { input: phoneInput, checks: [validators.phone] },
      { input: skillsInput, checks: [v => (v.length <= 200 ? '' : 'Keep skills under 200 characters.')] }
    ]);
    if (!valid) return;

    const result = window.HCStore.registerVolunteer({
      opportunityId: document.getElementById('regOppId').value,
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      skills: skillsInput.value.trim(),
      availability: document.getElementById('regAvailability').value
    });

    if (!result.success) {
      window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
      return;
    }

    window.closeModal('volunteerModal');
    form.reset();
    window.showToast(`🎉 You're registered for "${result.opportunity.title}" on ${window.HC.formatDate(result.opportunity.date)}.`, 'success');
    renderOpportunities();
  });
}
