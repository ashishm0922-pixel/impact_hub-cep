/**
 * HopeConnect AI - "Report" (flag content) button
 * Any element with data-report="ngo|campaign|opportunity" data-id="..." data-name="..."
 * opens a small form. Reports go to the admin panel → Flagged Content.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  const REASONS = [
    ['fraud', 'Looks like fraud or a scam'],
    ['misleading', 'Misleading or false information'],
    ['inappropriate', 'Inappropriate content'],
    ['spam', 'Spam'],
    ['other', 'Something else']
  ];
  let current = null; // { type, id, name }

  function buildModal() {
    if (document.getElementById('reportModal')) return;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'reportModal';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 460px;" role="dialog" aria-modal="true" aria-labelledby="reportTitle">
        <div class="modal-header">
          <h3 id="reportTitle" style="font-size: 1.1rem;"><i class="fas fa-flag" style="color: #C0392B;"></i> Report</h3>
          <button class="modal-close-btn" aria-label="Close">&times;</button>
        </div>
        <form id="reportForm" novalidate>
          <div class="modal-body">
            <p id="reportIntro" style="font-size: 0.9rem;"></p>
            <div class="form-group">
              <label for="reportReason">Reason *</label>
              <select class="form-control" id="reportReason">
                <option value="">Choose a reason</option>
                ${REASONS.map(([v, label]) => `<option value="${v}">${label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="reportDetails">Details (optional)</label>
              <textarea class="form-control" id="reportDetails" rows="3" maxlength="500" placeholder="What did you notice?"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('reportModal')">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Send report</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    const form = modal.querySelector('#reportForm');
    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled || !current) return;
      const reason = document.getElementById('reportReason');
      if (!HC.validateFields([{ input: reason, checks: [v => (v ? '' : 'Choose a reason.')] }])) return;

      HC.setLoading(submit, true, 'Sending...');
      const result = await window.HCStore.reportContent(current.type, current.id, reason.value, document.getElementById('reportDetails').value.trim());
      HC.setLoading(submit, false);
      if (!result.success) {
        window.showToast(result.error, result.code === 'ALREADY_REPORTED' ? 'info' : 'error', 'fas fa-flag');
        if (result.code === 'ALREADY_REPORTED') window.closeModal('reportModal');
        return;
      }
      window.closeModal('reportModal');
      window.showToast(result.message, 'success', 'fas fa-check');
    });
  }

  function openReport(type, id, name) {
    if (!HC.requireLogin('report content', { verified: false })) return;
    buildModal();
    current = { type, id, name };
    const form = document.getElementById('reportForm');
    form.reset();
    HC.clearFieldErrors(form);
    document.getElementById('reportIntro').textContent = `Tell our team what's wrong with "${name}". Reports are reviewed by an admin.`;
    window.openModal('reportModal');
  }

  HC.onPage(document, 'click', (event) => {
    const btn = event.target.closest?.('[data-report]');
    if (!btn) return;
    event.preventDefault();
    openReport(btn.dataset.report, btn.dataset.id, btn.dataset.name);
  });
})();
