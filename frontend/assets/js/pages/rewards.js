/**
 * HopeConnect AI - Rewards & Tiers (pages/rewards.html)
 * Public leaderboards (volunteers by confirmed hours, donors by pledges) and the badge/tier rules.
 * Names come from the server as "First L." (or "Anonymous") so nobody's details are exposed.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  const e = (v) => HC.escape(v);
  let tab = 'volunteers';

  HC.ready(() => {
    if (!document.getElementById('rewardsContent')) return;
    document.querySelectorAll('[data-rewards-tab]').forEach(btn => btn.addEventListener('click', () => {
      tab = btn.dataset.rewardsTab;
      document.querySelectorAll('[data-rewards-tab]').forEach(b => b.classList.toggle('active', b === btn));
      render();
    }));
    HC.onPage(document, 'hc:auth-changed', render); // locked/unlocked badges depend on who is logged in
    render();
  });

  const tierPill = (t) => `<span class="tier tier-${e(t.toLowerCase())}">${e(t)}</span>`;
  const rankCell = (r) => (r.rank <= 3
    ? `<span class="rank-medal rank-${r.rank}">🏅 #${r.rank}</span>`
    : `#${r.rank}`);

  function board(title, hint, headers, rows, empty) {
    return `
      <div class="admin-card">
        <h2>${title}</h2>
        <p>${hint}</p>
        <div class="data-table-container"><div class="table-scroll"><table class="custom-table">
          <thead><tr>${headers.map(h => `<th>${e(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows || `<tr><td colspan="${headers.length}" style="text-align: center; color: var(--text-muted);">${empty}</td></tr>`}</tbody>
        </table></div></div>
      </div>`;
  }

  async function render() {
    const box = document.getElementById('rewardsContent');
    if (!box) return;

    if (tab === 'badges') {
      box.innerHTML = badgesHtml();
      return;
    }

    box.innerHTML = '<div class="dash-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    const result = await window.HCStore.getLeaderboard(tab);
    if (!document.getElementById('rewardsContent')) return;
    if (!result.success) {
      box.innerHTML = `<div class="dash-empty"><h2>Could not load the leaderboard</h2><p>${e(result.error)}</p></div>`;
      return;
    }

    if (tab === 'volunteers') {
      const rows = result.rows.map(r => `
        <tr><td>${rankCell(r)}</td><td><strong>${e(r.name)}</strong></td><td>${e(r.city || '—')}</td>
        <td><strong>${e(r.hours)}</strong> hrs <span class="form-hint">(${e(r.events)} drive${r.events === 1 ? '' : 's'})</span></td>
        <td><strong style="color: var(--accent-blue);">${e(r.points)}</strong> pts</td><td>${tierPill(r.tier)}</td></tr>`).join('');
      box.innerHTML = board('Top volunteers', 'Ranked by hours that NGOs confirmed. 10 points per confirmed hour.',
        ['Rank', 'Volunteer', 'City', 'Verified service', 'Impact points', 'Tier'], rows,
        'No confirmed volunteer hours yet. <a href="' + e(HC.page('volunteer.html')) + '">Join a drive</a> and be the first!');
    } else {
      const rows = result.rows.map(r => `
        <tr><td>${rankCell(r)}</td><td><strong>${e(r.name)}</strong></td><td>${e(r.city || '—')}</td>
        <td><strong>${HC.formatINR(r.amount)}</strong> <span class="form-hint">(${e(r.campaignsSupported)} campaign${r.campaignsSupported === 1 ? '' : 's'})</span></td>
        <td><strong style="color: var(--accent-blue);">${e(r.points)}</strong> pts</td><td>${tierPill(r.tier)}</td></tr>`).join('');
      box.innerHTML = board('Top donors', 'Ranked by total pledged. 1 point per ₹100. Donors can appear as "Anonymous" from My Dashboard.',
        ['Rank', 'Donor', 'City', 'Pledged (demo)', 'Impact points', 'Tier'], rows,
        'No pledges yet. <a href="' + e(HC.page('campaigns.html')) + '">Support a campaign</a> to appear here.');
    }
  }

  function tierList(tiers) {
    return `<ul class="tier-rules">${tiers.map(t => `<li><span class="tier tier-${t.name.toLowerCase()}">${e(t.name)}</span> <strong>${e(t.label)}</strong><span class="form-hint">${e(t.rule)}</span></li>`).join('')}</ul>`;
  }

  function badgesHtml() {
    const loggedIn = window.HCStore.isLoggedIn();
    const badges = window.HCStore.getUserBadges();
    return `
      <div class="tier-grid">
        <div class="admin-card">
          <h3><i class="fas fa-hands-helping" style="color: var(--accent-green);"></i> Volunteer level tiers</h3>
          <p>Volunteers earn <strong>10 points</strong> for every service hour confirmed by the NGO.</p>
          ${tierList(HC_TIERS.volunteer)}
        </div>
        <div class="admin-card">
          <h3><i class="fas fa-heart" style="color: var(--accent-blue);"></i> Donor recognition tiers</h3>
          <p>Donors earn <strong>1 point per ₹100</strong> pledged to verified campaigns.</p>
          ${tierList(HC_TIERS.donor)}
        </div>
      </div>
      <h2 style="margin: 2rem 0 0.5rem;">All recognition badges</h2>
      <p style="font-size: 0.9rem;">${loggedIn ? 'Your progress is shown below.' : '<a href="#" data-auth="login">Log in</a> to see which badges you have unlocked.'}</p>
      <div class="badges-grid">
        ${badges.map(b => {
          const unlocked = loggedIn && b.unlocked;
          const pct = loggedIn ? Math.round((b.current / b.target) * 100) : 0;
          return `
            <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}">
              <div class="badge-card-icon">${b.icon}</div>
              <h4>${e(b.title)}</h4>
              <p>${e(b.description)}</p>
              ${unlocked
                ? '<span class="badge-status-pill unlocked"><i class="fas fa-check-circle"></i> Unlocked</span>'
                : `<div class="badge-progress"><span><i class="fas fa-lock"></i> ${loggedIn ? `Progress: ${e(b.current)} / ${e(b.target)}` : 'Locked'}</span>
                   ${loggedIn ? `<div class="progress-track"><div class="progress-bar" style="width: ${pct}%;"></div></div>` : ''}</div>`}
            </div>`;
        }).join('')}
      </div>`;
  }
})();
