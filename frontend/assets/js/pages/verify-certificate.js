/**
 * HopeConnect AI - Certificate check (pages/verify-certificate.html?code=HC-XXXXX-XXXXX)
 * Public page: anyone can confirm that a certificate ID is genuine.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  HC.ready(() => {
    const e = HC.escape;
    const params = new URLSearchParams(window.location.search);
    const card = document.getElementById('verifyCard');
    if (!card) return;

    card.innerHTML = `
      <div class="verify-icon" id="verifyIcon"><i class="fas fa-certificate" style="color: var(--accent-orange);"></i></div>
      <h1 id="verifyTitle">Check a certificate</h1>
      <p id="verifyMessage">Enter the certificate ID printed at the bottom of the certificate.</p>
      <form id="certCheckForm" class="auth-form" novalidate style="margin-top: 1rem;">
        <input class="form-control" id="certCode" placeholder="HC-XXXXX-XXXXX" maxlength="14" autocomplete="off" style="text-align:center; text-transform:uppercase;">
        <button class="btn btn-primary" type="submit" style="margin-top: .75rem;"><i class="fas fa-search"></i> Check</button>
      </form>
      <div id="certResult" aria-live="polite" style="margin-top: 1.25rem;"></div>`;

    const input = document.getElementById('certCode');
    const result = document.getElementById('certResult');

    async function check(code) {
      result.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      const { ok, data } = await HC.api('GET', `/api/certificates/verify/${encodeURIComponent(code.trim())}`);
      if (!ok) {
        result.innerHTML = `<p style="color:#C0392B"><i class="fas fa-times-circle"></i> ${e(data.error || 'Could not check this certificate.')}</p>`;
        return;
      }
      const detail = data.kind === 'volunteer'
        ? `${data.hours} confirmed hour${data.hours === 1 ? '' : 's'} across ${data.events} drive${data.events === 1 ? '' : 's'}`
        : `${HC.formatINR(data.amount)} pledged to ${data.campaigns} campaign${data.campaigns === 1 ? '' : 's'} (demo pledges, no money moved)`;
      result.innerHTML = `
        <p style="color: var(--accent-green); font-weight:700;"><i class="fas fa-check-circle"></i> Genuine certificate</p>
        <p><strong>${e(data.recipient)}</strong> (${data.kind === 'volunteer' ? 'Volunteer' : 'Donor'})</p>
        <p>${e(detail)}</p>
        <p style="font-size:.9rem;">Issued ${e(new Date(data.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))} · ID ${e(data.code)}</p>`;
    }

    document.getElementById('certCheckForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (input.value.trim()) check(input.value);
    });

    const code = params.get('code');
    if (code) {
      input.value = code.toUpperCase();
      check(code);
    }
  });
})();
