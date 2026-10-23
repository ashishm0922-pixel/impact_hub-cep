/**
 * HopeConnect AI - Contact page
 * General message form (sent to the server) + guide for registering an NGO.
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {

  function switchFormTab(type) {
    const showNgo = type === 'ngo';
    document.getElementById('generalContactForm').hidden = showNgo;
    document.getElementById('ngoRegisterForm').hidden = !showNgo;
    document.getElementById('tabGeneralBtn').className = `btn btn-sm ${showNgo ? 'btn-outline' : 'btn-primary'}`;
    document.getElementById('tabNgoBtn').className = `btn btn-sm ${showNgo ? 'btn-primary' : 'btn-outline'}`;
  }
  HC.expose('switchFormTab', switchFormTab);

  HC.ready(() => {
    // contact.html#register-ngo opens the NGO tab directly
    if (window.location.hash === '#register-ngo') switchFormTab('ngo');

    setupGeneralContactForm();
    setupNgoRegisterForm();
  });

  function setupGeneralContactForm() {
    const form = document.getElementById('generalContactForm');
    const { validators } = window.HC;
    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    const profile = window.HCStore.getProfile();
    nameInput.value = profile.name || '';
    emailInput.value = profile.email || '';

    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled) return;
      const messageInput = document.getElementById('contactMessage');
      const valid = window.HC.validateFields([
        { input: nameInput, checks: [validators.name] },
        { input: emailInput, checks: [validators.email] },
        { input: messageInput, checks: [v => validators.minLength(v, 10, 'Message')] }
      ]);
      if (!valid) return;

      HC.setLoading(submit, true, 'Sending...');
      const result = await window.HCStore.saveContactMessage({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        subject: document.getElementById('contactSubject').value.trim() || undefined,
        message: messageInput.value.trim()
      });
      HC.setLoading(submit, false);
      if (!result.success) {
        if (!HC.showServerErrors({ name: nameInput, email: emailInput, message: messageInput }, result)) {
          window.showToast(result.error, 'error', 'fas fa-exclamation-circle');
        }
        return;
      }
      window.showToast('Thank you! Your message was sent to the HopeConnect team.', 'success', 'fas fa-paper-plane');
      form.reset();
    });
  }

  // The NGO tab explains the steps and shows the right button for who is logged in
  function setupNgoRegisterForm() {
    const actions = document.getElementById('ngoRegisterActions');
    const render = () => {
      const profile = window.HCStore.getProfile();
      if (profile.role === 'ngo') {
        actions.innerHTML = `<a class="btn btn-green" href="${HC.escape(HC.page('dashboard.html'))}"><i class="fas fa-th-large"></i> Go to my dashboard</a>`;
      } else if (window.HCStore.isLoggedIn()) {
        actions.innerHTML = '<p class="form-hint">You are logged in as a volunteer/donor. Log out and create a separate NGO account to register an organization.</p>';
      } else {
        actions.innerHTML = `
          <button type="button" class="btn btn-green" id="ngoSignupBtn"><i class="fas fa-user-plus"></i> Sign up as an NGO</button>
          <button type="button" class="btn btn-outline" data-auth="login">I already have an NGO account</button>`;
        document.getElementById('ngoSignupBtn').addEventListener('click', () => {
          HC.openAuth('signup', { afterLogin: 'dashboard' });
          const role = document.getElementById('signupRole');
          if (role) role.value = 'ngo';
        });
      }
    };
    render();
    HC.onPage(document, 'hc:auth-changed', render);
  }
})();
