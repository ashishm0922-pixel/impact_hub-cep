/**
 * HopeConnect AI - Verify email page (pages/verify-email.html?token=...)
 * Opened from the link in the verification email. Sends the token to the server
 * with POST (so email scanners that pre-open links can't use it up).
 */

document.addEventListener('DOMContentLoaded', async () => {
  const token = new URLSearchParams(window.location.search).get('token') || '';

  // Remove the token from the address bar (so it isn't kept in history or shared by accident)
  window.history.replaceState(null, '', window.location.pathname);

  if (!token) {
    showResult('error', 'Link incomplete', 'This page needs the full link from your email. Please open the link again, or request a new one.');
    return;
  }

  const { ok, data } = await HC.api('POST', '/api/auth/verify-email', { token });
  if (ok) {
    showResult('success', 'Email verified!', 'Thank you. Your HopeConnect account is now verified.');
    if (window.Auth?.user) refreshCurrentUser(); // update header/banner if logged in on this browser
    return;
  }

  const title = data.code === 'TOKEN_EXPIRED' ? 'Link expired' : data.code === 'NETWORK_ERROR' ? 'Server not reachable' : 'Link not valid';
  showResult('error', title, data.error || 'Something went wrong. Please try again.', true);
});

function showResult(type, title, message, offerResend = false) {
  document.getElementById('verifyIcon').innerHTML = type === 'success'
    ? '<i class="fas fa-check-circle" style="color: var(--accent-green);"></i>'
    : '<i class="fas fa-exclamation-circle" style="color: #C0392B;"></i>';
  document.getElementById('verifyTitle').textContent = title;
  document.getElementById('verifyMessage').textContent = message;

  const actions = document.getElementById('verifyActions');
  actions.innerHTML = `<a href="${HC.escape(HC.page('index.html'))}" class="btn btn-primary"><i class="fas fa-home"></i> Go to HopeConnect</a>`;

  if (offerResend) {
    const resend = document.createElement('button');
    resend.type = 'button';
    resend.className = 'btn btn-outline';
    resend.innerHTML = '<i class="fas fa-paper-plane"></i> Send me a new link';
    resend.addEventListener('click', async () => {
      HC.setLoading(resend, true, 'Sending...');
      const { ok, status, data } = await HC.api('POST', '/api/auth/resend-verification');
      HC.setLoading(resend, false);
      if (ok) window.showToast(data.message, 'success', 'fas fa-paper-plane');
      else if (status === 401) HC.openAuth('login'); // need to log in first
      else window.showToast(data.error || 'Could not send the email.', 'error', 'fas fa-exclamation-circle');
    });
    actions.appendChild(resend);
  }
}
