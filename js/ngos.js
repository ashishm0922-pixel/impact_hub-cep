/**
 * HopeConnect AI - NGO Directory page
 * Search, filters and profile modal. Counts are calculated from live data.
 */

const ngoFilters = {
  category: 'all',
  search: '',
  verifiedOnly: false
};

document.addEventListener('DOMContentLoaded', () => {
  setupNgoFilters();
  renderNGOs();
});

// Live numbers for one NGO, calculated from campaigns / opportunities.
function getNgoActivity(ngo) {
  const campaigns = window.HCStore.getCampaigns().filter(c => c.ngoId === ngo.id);
  const opportunities = window.HCStore.getOpportunities().filter(o => o.ngoId === ngo.id);
  return {
    campaigns,
    opportunities,
    activeCampaigns: campaigns.filter(c => window.HCStore.isCampaignOpen(c)).length,
    openOpportunities: opportunities.filter(o => window.HCStore.getOpportunityAvailability(o).ok).length
  };
}

function verificationBadge(ngo) {
  return ngo.verified
    ? '<i class="fas fa-check-circle badge-verified" title="Verified NGO" aria-label="Verified NGO"></i>'
    : '<span class="badge-status-pill pending" title="Documents not yet reviewed"><i class="fas fa-hourglass-half"></i> Pending</span>';
}

function renderNGOs() {
  const grid = document.getElementById('ngosGrid');
  const countEl = document.getElementById('ngoResultCount');
  const all = window.HCStore.getNGOs();
  const { category, search, verifiedOnly } = ngoFilters;

  const filtered = all.filter(ngo => {
    if (category !== 'all' && ngo.category !== category) return false;
    if (verifiedOnly && !ngo.verified) return false;
    if (!search) return true;
    const haystack = [ngo.name, ngo.location, ngo.category, ngo.description].join(' ').toLowerCase();
    return search.toLowerCase().split(/\s+/).every(word => haystack.includes(word));
  });

  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${all.length} NGOs`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
        <i class="fas fa-search" style="font-size: 3rem; color: var(--border-light); margin-bottom: 1rem;"></i>
        <h3>No NGOs Found</h3>
        <p>Try searching for a different keyword or cause filter.</p>
      </div>
    `;
    return;
  }

  const { escape: e, safeUrl } = window.HC;
  grid.innerHTML = filtered.map(ngo => {
    const activity = getNgoActivity(ngo);
    return `
      <div class="ngo-card">
        <div class="ngo-banner-wrap">
          <img src="${safeUrl(ngo.banner)}" alt="" loading="lazy">
          <div class="ngo-logo-overlap">
            <img src="${safeUrl(ngo.logo)}" alt="${e(ngo.name)} logo" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        </div>
        <div class="ngo-card-body">
          <div>
            <div class="ngo-title-row">
              <h3>${e(ngo.name)}</h3>
              ${verificationBadge(ngo)}
            </div>
            <div class="ngo-meta">
              <span><i class="fas fa-map-marker-alt" style="color: var(--accent-orange);"></i> ${e(ngo.location)}</span>
              <span><i class="fas fa-tag" style="color: var(--accent-gold-hover);"></i> ${e(ngo.category)}</span>
            </div>
            <p>${e(ngo.description)}</p>
          </div>

          <div>
            <div class="ngo-stats-footer">
              <span><i class="fas fa-hands-helping" style="color: var(--accent-green);"></i> <strong>${activity.openOpportunities}</strong> Open drives</span>
              <span><i class="fas fa-bullhorn" style="color: var(--accent-blue);"></i> <strong>${activity.activeCampaigns}</strong> Active campaigns</span>
            </div>
            <div class="ngo-actions">
              <button class="btn btn-sm btn-secondary" style="flex: 1;" data-profile="${e(ngo.id)}">
                <i class="fas fa-info-circle"></i> View Profile
              </button>
              <a href="campaigns.html?category=${encodeURIComponent(ngo.category)}" class="btn btn-sm btn-primary" style="flex: 1;">
                <i class="fas fa-heart"></i> Support
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupNgoFilters() {
  const searchInput = document.getElementById('ngoSearchInput');
  const chips = document.querySelectorAll('#ngoFilterChips .filter-chip');

  searchInput?.addEventListener('input', (e) => {
    ngoFilters.search = e.target.value.trim();
    renderNGOs();
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      ngoFilters.category = chip.dataset.category;
      renderNGOs();
    });
  });

  document.getElementById('ngoVerifiedOnly')?.addEventListener('change', (e) => {
    ngoFilters.verifiedOnly = e.target.checked;
    renderNGOs();
  });

  document.getElementById('ngosGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-profile]');
    if (btn) viewNgoProfile(btn.dataset.profile);
  });
}

function viewNgoProfile(ngoId) {
  const ngo = window.HCStore.getNGOById(ngoId);
  if (!ngo) return;

  const { escape: e, safeUrl, formatDate } = window.HC;
  const activity = getNgoActivity(ngo);
  const openOpps = activity.opportunities.filter(o => window.HCStore.getOpportunityAvailability(o).ok);
  const openCamps = activity.campaigns.filter(c => window.HCStore.isCampaignOpen(c));

  document.getElementById('modalNgoName').textContent = ngo.name;
  document.getElementById('ngoProfileContent').innerHTML = `
    <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap;">
      <img src="${safeUrl(ngo.logo)}" alt="" style="width: 70px; height: 70px; border-radius: 16px; object-fit: cover; border: 2px solid var(--border-light);">
      <div>
        <h4 style="font-size: 1.3rem; margin-bottom: 0.2rem;">${e(ngo.name)} ${verificationBadge(ngo)}</h4>
        <div style="font-size: 0.88rem; color: var(--text-muted);"><i class="fas fa-map-marker-alt" style="color: var(--accent-orange);"></i> ${e(ngo.location)} • ${e(ngo.category)}</div>
        <div style="font-size: 0.85rem; color: var(--accent-green); font-weight: 600; margin-top: 0.2rem;">
          ${ngo.foundedYear ? `Founded in ${e(ngo.foundedYear)}` : ''}
          ${ngo.rating ? ` • ⭐ ${e(ngo.rating)} community rating` : ' • No ratings yet'}
        </div>
        ${ngo.website ? `<a href="${safeUrl(ngo.website)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.85rem;"><i class="fas fa-external-link-alt"></i> Website</a>` : ''}
      </div>
    </div>

    ${ngo.verified ? '' : `<div class="demo-callout warning"><i class="fas fa-hourglass-half"></i> Submitted on ${formatDate(ngo.submittedAt)}. Verification documents have not been reviewed yet — support with care.</div>`}

    <h5 style="margin-bottom: 0.4rem;">About the organization</h5>
    <p style="font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.6;">${e(ngo.description)}</p>

    <h5 style="margin-bottom: 0.5rem;">Open volunteer drives (${openOpps.length})</h5>
    ${openOpps.length
      ? `<ul style="margin: 0 0 1.25rem 1.1rem; font-size: 0.9rem;">${openOpps.map(o => `<li><a href="volunteer.html?opp=${encodeURIComponent(o.id)}">${e(o.title)}</a> — ${formatDate(o.date)}</li>`).join('')}</ul>`
      : '<p style="font-size: 0.88rem; margin-bottom: 1.25rem;">No open drives right now.</p>'}

    <h5 style="margin-bottom: 0.5rem;">Active campaigns (${openCamps.length})</h5>
    ${openCamps.length
      ? `<ul style="margin: 0 0 0.5rem 1.1rem; font-size: 0.9rem;">${openCamps.map(c => `<li><a href="campaigns.html?campaign=${encodeURIComponent(c.id)}">${e(c.title)}</a></li>`).join('')}</ul>`
      : '<p style="font-size: 0.88rem;">No active campaigns right now.</p>'}
  `;

  window.openModal('ngoProfileModal');
}
window.viewNgoProfile = viewNgoProfile;
