/**
 * HopeConnect AI - Contact page
 * General message form + NGO registration form (both validated, stored locally).
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  const DEFAULT_NGO_LOGO = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=80';
  const DEFAULT_NGO_BANNER = 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=600&auto=format&fit=crop&q=80';

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

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const messageInput = document.getElementById('contactMessage');
      const valid = window.HC.validateFields([
        { input: nameInput, checks: [validators.name] },
        { input: emailInput, checks: [validators.email] },
        { input: messageInput, checks: [v => validators.minLength(v, 10, 'Message')] }
      ]);
      if (!valid) return;

      window.HCStore.saveContactMessage({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        subject: document.getElementById('contactSubject').value.trim(),
        message: messageInput.value.trim()
      });
      window.showToast('Message saved (demo). Email delivery is not connected yet, so nobody has been notified.', 'success', 'fas fa-paper-plane');
      form.reset();
    });
  }

  function setupNgoRegisterForm() {
    const form = document.getElementById('ngoRegisterForm');
    const { validators } = window.HC;
    const currentYear = new Date().getFullYear();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('regNgoName');
      const categoryInput = document.getElementById('regNgoCategory');
      const locationInput = document.getElementById('regNgoLocation');
      const emailInput = document.getElementById('regNgoEmail');
      const yearInput = document.getElementById('regNgoYear');
      const websiteInput = document.getElementById('regNgoWebsite');
      const descInput = document.getElementById('regNgoDesc');

      const existingNames = window.HCStore.getNGOs().map(n => n.name.toLowerCase());

      const valid = window.HC.validateFields([
        { input: nameInput, checks: [
          v => validators.minLength(v, 3, 'Organization name'),
          v => (existingNames.includes(v.toLowerCase()) ? 'An NGO with this name is already listed.' : '')
        ] },
        { input: categoryInput, checks: [v => validators.required(v, 'Cause category')] },
        { input: locationInput, checks: [v => validators.minLength(v, 3, 'Location')] },
        { input: emailInput, checks: [validators.email] },
        { input: yearInput, checks: [v => {
          const year = Number(v);
          return Number.isInteger(year) && year >= 1850 && year <= currentYear ? '' : `Enter a year between 1850 and ${currentYear}.`;
        }] },
        { input: websiteInput, checks: [v => (!v || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v) ? '' : 'Enter a full URL starting with https://')] },
        { input: descInput, checks: [v => validators.minLength(v, 40, 'Description')] }
      ]);
      if (!valid) return;

      const newNgo = window.HCStore.addNGO({
        name: nameInput.value.trim(),
        category: categoryInput.value,
        location: locationInput.value.trim(),
        email: emailInput.value.trim(),
        website: websiteInput.value.trim(),
        description: descInput.value.trim(),
        foundedYear: Number(yearInput.value),
        logo: DEFAULT_NGO_LOGO,
        banner: DEFAULT_NGO_BANNER
      });

      window.showToast(`"${newNgo.name}" submitted. It is listed as Pending Verification.`, 'success', 'fas fa-check-double');
      form.reset();
      setTimeout(() => window.HC.go(window.HC.page('ngos.html')), 1500);
    });
  }
})();
