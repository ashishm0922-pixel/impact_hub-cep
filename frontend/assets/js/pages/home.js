/**
 * HopeConnect AI - Home page (index.html)
 * Page-specific bits only. The matcher and calculator live in assets/js/features/.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  HC.ready(renderHeroStats);

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
})();
