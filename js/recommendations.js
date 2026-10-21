/**
 * HopeConnect AI - Smart Recommendation Simulation Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initRecommendationEngine();
});

function initRecommendationEngine() {
  const chipButtons = document.querySelectorAll('.ai-chip-btn');
  const aiResponseText = document.getElementById('aiResponseText');
  const recsContainer = document.getElementById('aiRecsContainer');

  if (!chipButtons.length || !recsContainer) return;

  // Trigger initial recommendations for Environment
  generateRecommendations('Environment');

  chipButtons.forEach(button => {
    button.addEventListener('click', () => {
      chipButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');

      const cause = button.getAttribute('data-cause');
      
      // Update AI speech bubble with typing simulation effect
      if (aiResponseText) {
        aiResponseText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing causes and matched opportunities for <strong>${cause}</strong>...`;
        setTimeout(() => {
          aiResponseText.innerHTML = `✨ Based on your passion for <strong>${cause}</strong>, here are top curated opportunities & verified organizations making high impact:`;
          generateRecommendations(cause);
        }, 350);
      } else {
        generateRecommendations(cause);
      }
    });
  });
}

function generateRecommendations(category) {
  const recsContainer = document.getElementById('aiRecsContainer');
  if (!recsContainer || !window.HCStore) return;

  const allOpps = window.HCStore.getOpportunities();
  const allNgos = window.HCStore.getNGOs();

  const matchedOpps = allOpps.filter(opp => opp.category.toLowerCase() === category.toLowerCase());
  const matchedNgos = allNgos.filter(ngo => ngo.category.toLowerCase() === category.toLowerCase());

  let html = '';

  if (matchedOpps.length > 0) {
    matchedOpps.slice(0, 2).forEach(opp => {
      html += `
        <div class="rec-card">
          <img src="${opp.image}" alt="${opp.title}">
          <div class="rec-card-content">
            <div>
              <span class="section-badge" style="padding: 0.15rem 0.6rem; font-size: 0.75rem; margin-bottom: 0.35rem;">
                <i class="fas fa-calendar-check"></i> ${opp.date}
              </span>
              <h4>${opp.title}</h4>
              <p><i class="fas fa-map-marker-alt" style="color: var(--accent-orange);"></i> ${opp.location} • <strong>${opp.ngoName}</strong></p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.8rem; color: var(--accent-green); font-weight: 600;">
                <i class="fas fa-users"></i> ${opp.volunteersRegistered}/${opp.volunteersNeeded} Volunteers
              </span>
              <a href="volunteer.html" class="btn btn-sm btn-primary">Join Drive</a>
            </div>
          </div>
        </div>
      `;
    });
  }

  if (matchedNgos.length > 0) {
    const ngo = matchedNgos[0];
    html += `
      <div class="rec-card" style="background: linear-gradient(135deg, #FFFFFF, #FFFDF5); border-color: var(--accent-gold);">
        <img src="${ngo.logo}" alt="${ngo.name}" style="border-radius: 50%; width: 75px; height: 75px; align-self: center;">
        <div class="rec-card-content">
          <div>
            <span class="section-badge" style="background: var(--accent-green-light); color: var(--accent-green); padding: 0.15rem 0.6rem; font-size: 0.75rem; margin-bottom: 0.35rem;">
              <i class="fas fa-check-circle"></i> Verified Partner NGO
            </span>
            <h4>${ngo.name}</h4>
            <p>${ngo.description}</p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              <i class="fas fa-star" style="color: var(--accent-gold);"></i> ${ngo.rating} Rating (${ngo.volunteersCount}+ Volunteers)
            </span>
            <a href="ngos.html" class="btn btn-sm btn-secondary">View Profile</a>
          </div>
        </div>
      </div>
    `;
  }

  if (!html) {
    html = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No active recommendations found for this category yet. Check back soon!</div>`;
  }

  recsContainer.innerHTML = html;
}
