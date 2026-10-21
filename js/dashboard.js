/**
 * HopeConnect AI - Dashboards & Analytics Manager (User Impact & NGO Organizer)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('userImpactDashboard')) {
    initUserImpactDashboard();
  }

  if (document.getElementById('organizerDashboard')) {
    initOrganizerDashboard();
  }
});

/* ==========================================================================
   User Impact Dashboard Logic
   ========================================================================== */
function initUserImpactDashboard() {
  renderUserStats();
  renderUserBadges();
  renderImpactCharts();
  renderUserActivityTables();
}

function renderUserStats() {
  const stats = window.HCStore.getUserStats();
  const badges = window.HCStore.getUserBadges();
  const unlockedCount = badges.filter(b => b.unlocked).length;

  const statCampaigns = document.getElementById('statCampaignsSupported');
  const statHours = document.getElementById('statVolunteerHours');
  const statDonated = document.getElementById('statTotalContributed');
  const statBadges = document.getElementById('statBadgesEarned');

  if (statCampaigns) statCampaigns.textContent = stats.campaignsSupported;
  if (statHours) statHours.textContent = `${stats.volunteerHours} hrs`;
  if (statDonated) statDonated.textContent = `₹${stats.totalContributed.toLocaleString('en-IN')}`;
  if (statBadges) statBadges.textContent = unlockedCount;
}

function renderUserBadges() {
  const badgesContainer = document.getElementById('badgesGridContainer');
  if (!badgesContainer) return;

  const badges = window.HCStore.getUserBadges();
  badgesContainer.innerHTML = badges.map(badge => `
    <div class="badge-card ${badge.unlocked ? 'unlocked' : 'locked'}" id="badgeCard-${badge.id}">
      <div class="badge-card-icon">${badge.icon}</div>
      <h4>${badge.title}</h4>
      <p>${badge.description}</p>
      ${badge.unlocked 
        ? `<span class="badge-status-pill unlocked"><i class="fas fa-check-circle"></i> Unlocked on ${badge.unlockedAt || 'Aug 2026'}</span>`
        : `<button class="btn btn-sm btn-outline" onclick="unlockBadgePrompt('${badge.id}')"><i class="fas fa-lock"></i> Click to Unlock</button>`
      }
    </div>
  `).join('');
}

window.unlockBadgePrompt = function(badgeId) {
  const badge = window.HCStore.unlockBadge(badgeId);
  if (badge) {
    window.showToast(`🎉 Achievement Unlocked: ${badge.title}!`, 'gold', 'fas fa-award');
    renderUserStats();
    renderUserBadges();
  }
};

function renderImpactCharts() {
  const trendCtx = document.getElementById('impactMonthlyChart');
  const causeCtx = document.getElementById('impactCategoryChart');

  if (typeof Chart === 'undefined') return;

  if (trendCtx) {
    new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep (Est)'],
        datasets: [
          {
            label: 'Volunteer Hours',
            data: [8, 12, 6, 10, 12, 16],
            backgroundColor: '#E9B949',
            borderRadius: 6
          },
          {
            label: 'Donation (₹ in 100s)',
            data: [15, 20, 10, 15, 25, 30],
            backgroundColor: '#5B9A6A',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F0E4B8' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  if (causeCtx) {
    new Chart(causeCtx, {
      type: 'doughnut',
      data: {
        labels: ['Environment', 'Education', 'Healthcare', 'Animal Welfare'],
        datasets: [{
          data: [40, 30, 20, 10],
          backgroundColor: ['#5B9A6A', '#E9B949', '#4A8FE7', '#F28C5B']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

function renderUserActivityTables() {
  const regList = document.getElementById('userRegistrationsList');
  const donList = document.getElementById('userDonationsList');

  if (regList) {
    const registrations = window.HCStore.getUserRegistrations();
    if (registrations.length === 0) {
      regList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No volunteering activities yet. Explore opportunities to join!</td></tr>`;
    } else {
      regList.innerHTML = registrations.map(reg => `
        <tr>
          <td><strong>${reg.opportunityTitle}</strong></td>
          <td>${reg.ngoName}</td>
          <td>${reg.dateApplied}</td>
          <td><span class="badge-status-pill unlocked"><i class="fas fa-check"></i> ${reg.status || 'Confirmed'}</span></td>
        </tr>
      `).join('');
    }
  }

  if (donList) {
    const donations = window.HCStore.getUserDonations();
    if (donations.length === 0) {
      donList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No donations recorded yet.</td></tr>`;
    } else {
      donList.innerHTML = donations.map(don => `
        <tr>
          <td><strong>${don.campaignTitle}</strong></td>
          <td>${don.ngoName}</td>
          <td>${don.date}</td>
          <td><strong style="color: var(--accent-green);">₹${don.amount.toLocaleString('en-IN')}</strong></td>
        </tr>
      `).join('');
    }
  }
}

/* ==========================================================================
   Organizer Portal Dashboard Logic
   ========================================================================== */
function initOrganizerDashboard() {
  renderOrganizerMetrics();
  renderOrganizerCampaignsTable();
  renderOrganizerVolunteersTable();
  initCampaignCreationForm();
}

function renderOrganizerMetrics() {
  const campaigns = window.HCStore.getCampaigns();
  const volunteers = window.HCStore.getUserRegistrations();
  
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.raised || 0), 0);
  const totalVolunteersCount = 245 + volunteers.length;

  const statActiveCamp = document.getElementById('orgActiveCampaigns');
  const statVolunteers = document.getElementById('orgRegisteredVolunteers');
  const statFunds = document.getElementById('orgFundsRaised');

  if (statActiveCamp) statActiveCamp.textContent = campaigns.length;
  if (statVolunteers) statVolunteers.textContent = totalVolunteersCount;
  if (statFunds) statFunds.textContent = `₹${totalRaised.toLocaleString('en-IN')}`;
}

function renderOrganizerCampaignsTable() {
  const tbody = document.getElementById('orgCampaignsTableBody');
  if (!tbody) return;

  const campaigns = window.HCStore.getCampaigns();
  tbody.innerHTML = campaigns.map(c => {
    const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
    return `
      <tr>
        <td>
          <strong>${c.title}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${c.category} • ${c.location}</div>
        </td>
        <td>₹${(c.raised || 0).toLocaleString('en-IN')} / ₹${(c.goal || 0).toLocaleString('en-IN')}</td>
        <td style="width: 140px;">
          <div class="progress-track" style="margin: 0 0 4px 0;">
            <div class="progress-bar" style="width: ${pct}%;"></div>
          </div>
          <span style="font-size: 0.78rem; font-weight: 600;">${pct}%</span>
        </td>
        <td><span class="badge-status-pill unlocked"><i class="fas fa-circle" style="font-size: 0.55rem;"></i> Active</span></td>
      </tr>
    `;
  }).join('');
}

function renderOrganizerVolunteersTable() {
  const tbody = document.getElementById('orgVolunteersTableBody');
  if (!tbody) return;

  const applicants = window.HCStore.getUserRegistrations();
  const defaultSample = [
    { name: 'Rohan Deshmukh', email: 'rohan.d@example.com', opportunityTitle: 'Mega Urban Tree Plantation', skills: 'Physical Labor, Driving', status: 'Approved' },
    { name: 'Priya Nair', email: 'priya.nair@example.com', opportunityTitle: 'Weekend Math Mentorship', skills: 'Teaching, Python', status: 'Approved' },
    { name: 'Kunal Patil', email: 'kunal.p@example.com', opportunityTitle: 'Community Health Screening', skills: 'First Aid, Admin', status: 'Pending Review' }
  ];

  const allApplicants = [...applicants, ...defaultSample];

  tbody.innerHTML = allApplicants.map(v => `
    <tr>
      <td>
        <strong>${v.name}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${v.email}</div>
      </td>
      <td>${v.opportunityTitle}</td>
      <td>${v.skills || 'General Volunteer'}</td>
      <td>
        <span class="badge-status-pill ${v.status === 'Approved' || v.status === 'Confirmed' ? 'unlocked' : 'locked'}">
          ${v.status || 'Confirmed'}
        </span>
      </td>
    </tr>
  `).join('');
}

function initCampaignCreationForm() {
  const form = document.getElementById('createCampaignForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('newCampTitle').value.trim();
    const category = document.getElementById('newCampCategory').value;
    const goal = document.getElementById('newCampGoal').value;
    const location = document.getElementById('newCampLocation').value.trim();
    const description = document.getElementById('newCampDescription').value.trim();
    const image = document.getElementById('newCampImage').value.trim() || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80';

    if (!title || !goal) {
      window.showToast('Please fill all required campaign fields.', 'info', 'fas fa-exclamation-triangle');
      return;
    }

    const newCampaign = window.HCStore.addCampaign({
      title,
      category,
      goal: Number(goal),
      raised: 0,
      supporters: 0,
      location,
      description,
      image,
      ngoName: 'Green Earth Foundation (My NGO)',
      featured: true
    });

    window.showToast(`🎉 Campaign "${newCampaign.title}" published successfully!`, 'success', 'fas fa-bullhorn');
    form.reset();
    window.closeModal('createCampaignModal');
    
    renderOrganizerMetrics();
    renderOrganizerCampaignsTable();
  });
}
