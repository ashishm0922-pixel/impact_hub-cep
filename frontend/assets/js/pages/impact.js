/**
 * HopeConnect AI - Impact page (pages/impact.html)
 * Your hours, donations, badges and charts. Every number is calculated
 * from your stored records by HCStore — nothing is hard-coded.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  HC.ready(() => {
    if (!document.getElementById('userImpactDashboard')) return;
    initUserImpactDashboard();
    // Re-render when someone logs in or out (different user = different activity)
    HC.onPage(document, 'hc:profile-changed', initUserImpactDashboard);
  });

  function initUserImpactDashboard() {
    renderUserStats();
    renderUserBadges();
    renderImpactCharts();
    renderUserActivityTables();
  }

  function renderUserStats() {
    const stats = window.HCStore.getUserStats();
    const unlocked = window.HCStore.getUserBadges().filter(b => b.unlocked).length;
    const profile = window.HCStore.getProfile();

    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set('statCampaignsSupported', stats.campaignsSupported);
    set('statVolunteerHours', `${stats.volunteerHours} hrs`);
    set('statTotalContributed', window.HC.formatINR(stats.totalContributed));
    set('statBadgesEarned', unlocked);
    set('statUpcomingNote', stats.eventsUpcoming
      ? `+${stats.upcomingHours} hrs pending from ${stats.eventsUpcoming} upcoming event${stats.eventsUpcoming > 1 ? 's' : ''}`
      : 'Hours count after attendance is confirmed');
    const intro = document.getElementById('impactIntro');
    if (intro) {
      intro.innerHTML = profile.isDemo
        ? `<a href="#" data-auth="login">Log in</a> to see your volunteer hours, pledges, badges and certificate.`
        : `Showing activity for <strong>${HC.escape(profile.name)}</strong>. Hours count once an organizer confirms your attendance.`;
    }
  }

  function renderUserBadges() {
    const container = document.getElementById('badgesGridContainer');
    if (!container) return;
    const e = window.HC.escape;

    container.innerHTML = window.HCStore.getUserBadges().map(badge => {
      const pct = Math.round((badge.current / badge.target) * 100);
      const progressText = badge.target >= 1000
        ? `${window.HC.formatINR(badge.current)} / ${window.HC.formatINR(badge.target)}`
        : `${badge.current} / ${badge.target}`;
      return `
        <div class="badge-card ${badge.unlocked ? 'unlocked' : 'locked'}">
          <div class="badge-card-icon">${badge.icon}</div>
          <h4>${e(badge.title)}</h4>
          <p>${e(badge.description)}</p>
          ${badge.unlocked
            ? '<span class="badge-status-pill unlocked"><i class="fas fa-check-circle"></i> Earned</span>'
            : `<div class="badge-progress">
                 <span><i class="fas fa-lock"></i> Progress: ${progressText}</span>
                 <div class="progress-track"><div class="progress-bar" style="width: ${pct}%;"></div></div>
               </div>`}
        </div>
      `;
    }).join('');
  }

  const chartInstances = {};

  function renderImpactCharts() {
    if (typeof Chart === 'undefined') {
      document.querySelectorAll('.chart-card canvas').forEach(canvas => {
        canvas.insertAdjacentHTML('afterend', '<p class="form-hint">Charts could not load (offline or CDN blocked).</p>');
      });
      return;
    }

    const trendCtx = document.getElementById('impactMonthlyChart');
    const causeCtx = document.getElementById('impactCategoryChart');

    if (trendCtx) {
      const history = window.HCStore.getMonthlyHistory(6);
      chartInstances.trend?.destroy();
      chartInstances.trend = new Chart(trendCtx, {
        type: 'bar',
        data: {
          labels: history.map(m => m.label),
          datasets: [
            { label: 'Volunteer hours (attended)', data: history.map(m => m.hours), backgroundColor: '#E9B949', borderRadius: 6, yAxisID: 'y' },
            { label: 'Donations (₹, demo)', data: history.map(m => m.donation), backgroundColor: '#5B9A6A', borderRadius: 6, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Hours' }, grid: { color: '#F0E4B8' }, ticks: { precision: 0 } },
            y1: { beginAtZero: true, position: 'right', title: { display: true, text: '₹' }, grid: { display: false } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    if (causeCtx) {
      const distribution = window.HCStore.getCauseDistribution();
      const labels = Object.keys(distribution);
      const palette = ['#5B9A6A', '#E9B949', '#4A8FE7', '#F28C5B', '#9B6BD3', '#E05A7A', '#3BB0A8'];
      chartInstances.cause?.destroy();
      chartInstances.cause = new Chart(causeCtx, {
        type: 'doughnut',
        data: {
          labels: labels.length ? labels : ['No activity yet'],
          datasets: [{
            data: labels.length ? Object.values(distribution) : [1],
            backgroundColor: labels.length ? palette.slice(0, labels.length) : ['#EEE']
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }
  }

  function renderUserActivityTables() {
    const { escape: e, formatDate, formatINR } = window.HC;
    const regList = document.getElementById('userRegistrationsList');
    const donList = document.getElementById('userDonationsList');

    if (regList) {
      const registrations = window.HCStore.getUserRegistrations();
      regList.innerHTML = registrations.length === 0
        ? '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No volunteering activities yet. Explore opportunities to join!</td></tr>'
        : registrations.map(reg => `
          <tr>
            <td><strong>${e(reg.opportunityTitle)}</strong><div style="font-size: 0.78rem; color: var(--text-muted);">${e(reg.hours)} hrs</div></td>
            <td>${e(reg.ngoName)}</td>
            <td>${formatDate(reg.eventDate)}</td>
            <td>${window.HC.statusPill(reg.status)}</td>
          </tr>
        `).join('');
    }

    if (donList) {
      const donations = window.HCStore.getUserDonations();
      donList.innerHTML = donations.length === 0
        ? '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No donations recorded yet.</td></tr>'
        : donations.map(don => `
          <tr>
            <td><strong>${e(don.campaignTitle)}</strong><div style="font-size: 0.78rem; color: var(--text-muted);">${e(don.reference)} • demo</div></td>
            <td>${e(don.ngoName)}</td>
            <td>${formatDate(don.date)}</td>
            <td><strong style="color: var(--accent-green);">${formatINR(don.amount)}</strong></td>
          </tr>
        `).join('');
    }
  }
})();
