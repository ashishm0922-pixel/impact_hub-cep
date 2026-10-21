/**
 * HopeConnect AI - Smart Cause Matcher (rule-based)
 *
 * This is NOT machine learning. Each open opportunity gets points for
 * matching your preferences, and we show the reasons. Keeping it transparent
 * makes it easy to test and to replace later with a real AI/ML service.
 */

const MATCH_POINTS = {
  cause: 40,       // opportunity is in a cause you picked
  city: 25,        // happens in your city
  remote: 15,      // can be done online and you're open to remote
  skillEach: 10,   // per matching skill...
  skillMax: 20,    // ...up to this many points
  timing: 15,      // fits when you're free
  spots: 5,        // plenty of open spots
  soon: 5          // happening within the next 2 weeks
};
const MAX_POINTS = MATCH_POINTS.cause + MATCH_POINTS.city + MATCH_POINTS.skillMax + MATCH_POINTS.timing + MATCH_POINTS.spots + MATCH_POINTS.soon;

document.addEventListener('DOMContentLoaded', () => {
  renderHeroStats();
  initMatcher();
});

// Home hero numbers come from the actual (demo) data instead of made-up totals
function renderHeroStats() {
  const store = window.HCStore;
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const raised = store.getCampaigns().reduce((sum, c) => sum + (c.raised || 0), 0);
  set('heroStatNgos', store.getNGOs().filter(n => n.verified).length);
  set('heroStatDrives', store.getOpportunities().filter(o => store.getOpportunityAvailability(o).ok).length);
  set('heroStatRaised', raised >= 100000 ? `₹${(raised / 100000).toFixed(1)} L` : window.HC.formatINR(raised));
}

function initMatcher() {
  const form = document.getElementById('matcherForm');
  if (!form || !window.HCStore) return;

  const chips = form.querySelectorAll('#matcherCauses .ai-chip-btn');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const selected = chip.classList.toggle('selected');
    chip.setAttribute('aria-pressed', String(selected));
  }));

  // Restore saved preferences (or a sensible default) and show matches right away
  const saved = window.HCStore.getPreferences() || { causes: ['Environment'], city: '', availability: 'Flexible', skills: '', remote: false };
  applyPreferencesToForm(saved);
  renderMatches(saved);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const prefs = readPreferencesFromForm();
    window.HCStore.savePreferences(prefs);
    renderMatches(prefs);
    document.getElementById('aiRecsContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function applyPreferencesToForm(prefs) {
  document.querySelectorAll('#matcherCauses .ai-chip-btn').forEach(chip => {
    const on = prefs.causes.includes(chip.dataset.cause);
    chip.classList.toggle('selected', on);
    chip.setAttribute('aria-pressed', String(on));
  });
  document.getElementById('matcherCity').value = prefs.city || '';
  document.getElementById('matcherAvailability').value = prefs.availability || 'Flexible';
  document.getElementById('matcherSkills').value = prefs.skills || '';
  document.getElementById('matcherRemote').checked = Boolean(prefs.remote);
}

function readPreferencesFromForm() {
  return {
    causes: [...document.querySelectorAll('#matcherCauses .ai-chip-btn.selected')].map(c => c.dataset.cause),
    city: document.getElementById('matcherCity').value.trim(),
    availability: document.getElementById('matcherAvailability').value,
    skills: document.getElementById('matcherSkills').value.trim(),
    remote: document.getElementById('matcherRemote').checked
  };
}

function splitSkills(text) {
  return String(text || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Score one opportunity against the user's preferences.
 * Returns { points, percent, reasons[] }. Exported on window for testing.
 */
function scoreOpportunity(opp, prefs) {
  let points = 0;
  const reasons = [];
  const { todayISO, daysBetween } = window.HC_DATE;

  if (prefs.causes.length === 0 || prefs.causes.includes(opp.category)) {
    points += MATCH_POINTS.cause;
    reasons.push(prefs.causes.length ? `Matches your interest in ${opp.category}` : `${opp.category} (no cause selected)`);
  }

  const city = (prefs.city || '').toLowerCase();
  if (city && [opp.city, opp.location].join(' ').toLowerCase().includes(city)) {
    points += MATCH_POINTS.city;
    reasons.push(`In ${opp.city || prefs.city}`);
  } else if (prefs.remote && opp.remote) {
    points += MATCH_POINTS.remote;
    reasons.push('Can be done online');
  }

  const mySkills = splitSkills(prefs.skills);
  const matchedSkills = (opp.skills || []).filter(skill =>
    mySkills.some(mine => mine.includes(skill) || skill.includes(mine)));
  if (matchedSkills.length) {
    points += Math.min(MATCH_POINTS.skillMax, matchedSkills.length * MATCH_POINTS.skillEach);
    reasons.push(`Uses your skills: ${matchedSkills.join(', ')}`);
  }

  if (prefs.availability === 'Flexible' || opp.availability === 'Flexible' || opp.availability === prefs.availability) {
    points += MATCH_POINTS.timing;
    reasons.push(`Fits your time (${opp.availability || 'Flexible'})`);
  }

  const spotsLeft = opp.volunteersNeeded - (opp.volunteersRegistered || 0);
  if (spotsLeft / opp.volunteersNeeded >= 0.25) {
    points += MATCH_POINTS.spots;
    reasons.push(`${spotsLeft} spots still open`);
  }

  const daysAway = opp.date ? daysBetween(todayISO(), opp.date) : 99;
  if (daysAway >= 0 && daysAway <= 14) {
    points += MATCH_POINTS.soon;
    reasons.push(daysAway === 0 ? 'Happening today' : `Happening in ${daysAway} day${daysAway === 1 ? '' : 's'}`);
  }

  return { points, percent: Math.round((points / MAX_POINTS) * 100), reasons };
}
window.scoreOpportunity = scoreOpportunity;

function renderMatches(prefs) {
  const container = document.getElementById('aiRecsContainer');
  const bubble = document.getElementById('aiResponseText');
  const { escape: e, safeUrl, formatDate } = window.HC;

  const ranked = window.HCStore.getOpportunities()
    .filter(opp => window.HCStore.getOpportunityAvailability(opp).ok)
    .map(opp => ({ opp, ...scoreOpportunity(opp, prefs) }))
    // Must at least match a picked cause, OR match on city/skills if no cause fits
    .filter(m => m.points >= MATCH_POINTS.cause || m.reasons.some(r => r.startsWith('In ') || r.startsWith('Uses')))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);

  if (bubble) {
    const causeText = prefs.causes.length ? prefs.causes.join(', ') : 'any cause';
    bubble.innerHTML = ranked.length
      ? `Found <strong>${ranked.length}</strong> match${ranked.length > 1 ? 'es' : ''} for <strong>${e(causeText)}</strong>${prefs.city ? ` near <strong>${e(prefs.city)}</strong>` : ''}. Higher score = more of your preferences met.`
      : `No open drives match <strong>${e(causeText)}</strong> yet. Try adding more causes or clearing the city.`;
  }

  let html = ranked.map(({ opp, percent, reasons }) => `
    <div class="rec-card">
      <img src="${safeUrl(opp.image)}" alt="" loading="lazy">
      <div class="rec-card-content">
        <div>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.35rem;">
            <span class="match-score"><i class="fas fa-bullseye"></i> ${percent}% match</span>
            <span class="section-badge" style="padding: 0.15rem 0.6rem; font-size: 0.75rem; margin: 0;"><i class="fas fa-calendar-check"></i> ${formatDate(opp.date)}</span>
          </div>
          <h4>${e(opp.title)}</h4>
          <p><i class="fas fa-map-marker-alt" style="color: var(--accent-orange);"></i> ${e(opp.location)} • <strong>${e(opp.ngoName)}</strong></p>
          <ul class="match-reasons">${reasons.map(r => `<li>${e(r)}</li>`).join('')}</ul>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.8rem; color: var(--accent-green); font-weight: 600;">
            <i class="fas fa-users"></i> ${e(opp.volunteersRegistered)}/${e(opp.volunteersNeeded)} volunteers
          </span>
          <a href="volunteer.html?opp=${encodeURIComponent(opp.id)}" class="btn btn-sm btn-primary">Join Drive</a>
        </div>
      </div>
    </div>
  `).join('');

  // Suggest one NGO working on the top cause
  const topCause = ranked[0]?.opp.category || prefs.causes[0];
  const ngo = window.HCStore.getNGOs().find(n => n.category === topCause && n.verified);
  if (ngo) {
    html += `
      <div class="rec-card" style="background: linear-gradient(135deg, #FFFFFF, #FFFDF5); border-color: var(--accent-gold);">
        <img src="${safeUrl(ngo.logo)}" alt="" style="border-radius: 50%; width: 75px; height: 75px; align-self: center;">
        <div class="rec-card-content">
          <div>
            <span class="section-badge" style="background: var(--accent-green-light); color: var(--accent-green); padding: 0.15rem 0.6rem; font-size: 0.75rem; margin-bottom: 0.35rem;">
              <i class="fas fa-check-circle"></i> Verified NGO in ${e(topCause)}
            </span>
            <h4>${e(ngo.name)}</h4>
            <p>${e(ngo.description)}</p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-map-marker-alt"></i> ${e(ngo.location)}</span>
            <a href="ngos.html" class="btn btn-sm btn-secondary">View NGOs</a>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html || '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No matching drives right now. Check back soon!</div>';
}
