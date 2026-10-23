/**
 * HopeConnect AI - Campaigns page
 * Listing, filters, sorting and the DEMO donation flow.
 * No payment provider is connected: donations are only recorded locally.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  const MIN_DONATION = 10;
  const MAX_DONATION = 1000000;

  const campaignFilters = {
    category: 'all',
    search: '',
    sort: 'featured'
  };

  HC.ready(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) campaignFilters.category = params.get('category');

    setupCampaignFilters();
    setupDonationFlow();
    renderCampaigns();

    // Links like campaigns.html?donateAmount=500 or ?campaign=camp-2
    if (params.get('donateAmount') || params.get('campaign')) {
      openDonationModal(params.get('campaign'), params.get('donateAmount'));
    }
  });

  function sortCampaigns(list) {
    const store = window.HCStore;
    const progress = c => (c.raised || 0) / (c.goal || 1);
    const sorters = {
      featured: (a, b) => Number(b.featured) - Number(a.featured),
      ending: (a, b) => (store.getDaysLeft(a) ?? 999) - (store.getDaysLeft(b) ?? 999),
      progress: (a, b) => progress(b) - progress(a),
      newest: () => 0 // already stored newest-first
    };
    // Closed / ended campaigns always go to the bottom
    return [...list].sort((a, b) =>
      Number(store.isCampaignOpen(b)) - Number(store.isCampaignOpen(a)) || sorters[campaignFilters.sort](a, b));
  }

  function renderCampaigns() {
    const grid = document.getElementById('campaignsGrid');
    const countEl = document.getElementById('campaignResultCount');
    const all = window.HCStore.getCampaigns();
    const { category, search } = campaignFilters;

    const filtered = sortCampaigns(all.filter(c => {
      if (category !== 'all' && c.category !== category) return false;
      if (!search) return true;
      const haystack = [c.title, c.ngoName, c.location, c.description, c.category].join(' ').toLowerCase();
      return search.toLowerCase().split(/\s+/).every(word => haystack.includes(word));
    }));

    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${all.length} campaigns`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-hand-holding-heart" style="font-size: 3rem; color: var(--border-light); margin-bottom: 1rem;"></i>
          <h3>No Campaigns Found</h3>
          <p>Try searching for a different cause or keyword.</p>
        </div>
      `;
      return;
    }

    const { escape: e, formatINR, safeUrl } = window.HC;
    grid.innerHTML = filtered.map(c => {
      const percent = Math.min(100, Math.round(((c.raised || 0) / (c.goal || 1)) * 100));
      const open = window.HCStore.isCampaignOpen(c);
      const daysLeft = window.HCStore.getDaysLeft(c);
      return `
        <div class="campaign-card">
          <div class="campaign-img-wrap">
            <img src="${safeUrl(c.image)}" alt="${e(c.title)}" loading="lazy">
            <span class="opp-category-tag" style="background: rgba(255, 251, 234, 0.95);">${e(c.category)}</span>
          </div>
          <div class="campaign-body">
            <div>
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--accent-orange); margin-bottom: 0.35rem;">
                <i class="fas fa-building"></i> ${e(c.ngoName)}
              </div>
              <h3 style="font-size: 1.2rem; margin-bottom: 0.65rem; line-height: 1.35;">${e(c.title)}</h3>
              <p style="font-size: 0.9rem; margin-bottom: 1.25rem;">${e(c.description)}</p>
            </div>

            <div>
              <div class="funding-numbers">
                <div>
                  <span style="font-size: 0.78rem; color: var(--text-muted); display: block;">Raised (demo figures)</span>
                  <strong>${formatINR(c.raised)}</strong>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 0.78rem; color: var(--text-muted); display: block;">Goal</span>
                  <span style="font-weight: 600; color: var(--text-muted);">${formatINR(c.goal)}</span>
                </div>
              </div>

              <div class="progress-track" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${percent}% funded">
                <div class="progress-bar" style="width: ${percent}%;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                <span><i class="fas fa-heart" style="color: var(--accent-orange);"></i> <strong>${e(c.supporters || 0)}</strong> Supporters • ${percent}%</span>
                <span><i class="fas fa-clock"></i> ${open ? `<strong>${daysLeft}</strong> days left` : '<strong>Closed</strong>'}</span>
              </div>

              ${open
                ? `<button class="btn btn-green" style="width: 100%;" data-donate="${e(c.id)}"><i class="fas fa-heart"></i> Support This Cause</button>
                   <button type="button" class="report-link" data-report="campaign" data-id="${e(c.id)}" data-name="${e(c.title)}"><i class="fas fa-flag"></i> Report</button>`
                : `<button class="btn btn-secondary" style="width: 100%;" disabled><i class="fas fa-lock"></i> No longer accepting support</button>`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function setupCampaignFilters() {
    const searchInput = document.getElementById('campaignSearchInput');
    const chips = document.querySelectorAll('#campaignFilterChips .filter-chip');
    const sortSelect = document.getElementById('campaignSort');

    searchInput?.addEventListener('input', (e) => {
      campaignFilters.search = e.target.value.trim();
      renderCampaigns();
    });

    chips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.category === campaignFilters.category);
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        campaignFilters.category = chip.dataset.category;
        renderCampaigns();
      });
    });

    sortSelect?.addEventListener('change', (e) => {
      campaignFilters.sort = e.target.value;
      renderCampaigns();
    });

    document.getElementById('campaignsGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-donate]');
      if (btn) openDonationModal(btn.dataset.donate);
    });
  }

  /* ---------------- Donation modal ---------------- */

  function fillCampaignSelect(selectedId) {
    const select = document.getElementById('donCampSelect');
    const openCampaigns = window.HCStore.getCampaigns().filter(c => window.HCStore.isCampaignOpen(c));
    select.innerHTML = openCampaigns
      .map(c => `<option value="${window.HC.escape(c.id)}">${window.HC.escape(c.title)} — ${window.HC.escape(c.ngoName)}</option>`)
      .join('');
    if (selectedId && openCampaigns.some(c => c.id === selectedId)) select.value = selectedId;
    updateModalHeader();
    return openCampaigns.length;
  }

  function updateModalHeader() {
    const campaign = window.HCStore.getCampaignById(document.getElementById('donCampSelect').value);
    document.getElementById('modalCampTitle').textContent = campaign ? campaign.title : 'Support a Cause';
    document.getElementById('modalCampNgo').textContent = campaign ? `Beneficiary NGO: ${campaign.ngoName}` : '';
  }

  function setActiveTier(amount) {
    document.querySelectorAll('.don-tier-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === String(amount));
    });
  }

  function openDonationModal(campId, prefillAmount = null) {
    const form = document.getElementById('donationForm');
    if (!HC.requireLogin('support a campaign')) return;
    if (fillCampaignSelect(campId) === 0) {
      window.showToast('There are no open campaigns right now.', 'info', 'fas fa-info-circle');
      return;
    }

    window.HC.clearFieldErrors(form);
    form.hidden = false;
    document.getElementById('donationReceipt').hidden = true;

    const profile = window.HCStore.getProfile();
    document.getElementById('donorName').value = profile.name || '';
    document.getElementById('donorEmail').value = profile.email || '';

    const amount = parseInt(prefillAmount, 10) || 1000;
    document.getElementById('customDonAmount').value = amount;
    setActiveTier(amount);

    window.openModal('donationModal');
  }
  HC.expose('openDonationModal', openDonationModal);

  function validateAmount(value) {
    const amount = Number(value);
    if (!value || !Number.isInteger(amount)) return 'Enter a whole rupee amount.';
    if (amount < MIN_DONATION) return `Minimum amount is ₹${MIN_DONATION}.`;
    if (amount > MAX_DONATION) return 'Maximum demo amount is ₹10,00,000.';
    return '';
  }

  function setupDonationFlow() {
    const form = document.getElementById('donationForm');
    const customInput = document.getElementById('customDonAmount');
    document.querySelectorAll('.don-tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        customInput.value = btn.dataset.val;
        setActiveTier(btn.dataset.val);
        window.HC.setFieldError(customInput, '');
      });
    });

    customInput.addEventListener('input', (e) => setActiveTier(e.target.value));
    document.getElementById('donCampSelect').addEventListener('change', updateModalHeader);

    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled) return;
      const valid = window.HC.validateFields([{ input: customInput, checks: [validateAmount] }]);
      if (!valid) return;

      HC.setLoading(submit, true, 'Recording...');
      const result = await window.HCStore.recordPledge(
        document.getElementById('donCampSelect').value,
        Number(customInput.value)
      );
      HC.setLoading(submit, false);

      if (!result.success) {
        if (!HC.showServerErrors({ amount: customInput }, result)) {
          window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
        }
        return;
      }

      showReceipt(result.donation);
      renderCampaigns();
    });
  }

  function showReceipt(donation) {
    const { escape: e, formatINR, formatDate } = window.HC;
    document.getElementById('donationReceiptDetails').innerHTML = `
      <dl>
        <dt>Reference</dt><dd>${e(donation.reference)}</dd>
        <dt>Campaign</dt><dd>${e(donation.campaignTitle)}</dd>
        <dt>NGO</dt><dd>${e(donation.ngoName)}</dd>
        <dt>Amount (pledged)</dt><dd>${formatINR(donation.amount)}</dd>
        <dt>Donor</dt><dd>${e(donation.donorName)}</dd>
        <dt>Date</dt><dd>${formatDate(donation.date)}</dd>
        <dt>Payment status</dt><dd style="color: var(--accent-orange-hover);">Not charged (demo)</dd>
      </dl>
    `;
    document.getElementById('donationForm').hidden = true;
    document.getElementById('donationReceipt').hidden = false;
    window.showToast(`Demo donation of ${formatINR(donation.amount)} recorded. No money was charged.`, 'success', 'fas fa-heart');
  }
})();
