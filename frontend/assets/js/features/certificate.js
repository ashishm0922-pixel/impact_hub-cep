/**
 * HopeConnect AI - Dynamic Volunteer Certificate Generator (HTML5 Canvas)
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  HC.ready(() => {
    initCertificateGenerator();
  });

  function initCertificateGenerator() {
    const canvas = document.getElementById('certificateCanvas');
    const nameInput = document.getElementById('certVolunteerName');
    const updateBtn = document.getElementById('updateCertBtn');
    const downloadBtn = document.getElementById('downloadCertBtn');

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    function drawCertificate(recipientName, hours, certificateId) {
      // Canvas dimensions (A4 Landscape aspect ratio)
      canvas.width = 1200;
      canvas.height = 840;

      // Background fill
      ctx.fillStyle = '#FFFDF5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Elegant Outer Border
      ctx.strokeStyle = '#E9B949';
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Inner Delicate Border
      ctx.strokeStyle = '#243038';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

      // Corner Ornaments
      drawCornerRibbon(ctx, 52, 52);
      drawCornerRibbon(ctx, canvas.width - 52, 52, true);

      // Header Branding
      ctx.textAlign = 'center';
      ctx.fillStyle = '#E27339';
      ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('HOPECONNECT AI ECOSYSTEM', canvas.width / 2, 110);

      // Title
      ctx.fillStyle = '#243038';
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('CERTIFICATE OF PARTICIPATION', canvas.width / 2, 175);

      // Subtitle
      ctx.fillStyle = '#5C6B73';
      ctx.font = '18px "Inter", sans-serif';
      ctx.fillText('THIS CERTIFICATE IS PRESENTED TO', canvas.width / 2, 230);

      // Recipient Name
      ctx.fillStyle = '#1B262C';
      // Shrink long names so they always fit inside the border
      let nameSize = 48;
      ctx.font = `bold ${nameSize}px "Plus Jakarta Sans", sans-serif`;
      while (ctx.measureText(recipientName.toUpperCase()).width > canvas.width - 220 && nameSize > 24) {
        nameSize -= 2;
        ctx.font = `bold ${nameSize}px "Plus Jakarta Sans", sans-serif`;
      }
      ctx.fillText(recipientName.toUpperCase(), canvas.width / 2, 310);

      // Decorative underline under name
      ctx.strokeStyle = '#E9B949';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 250, 335);
      ctx.lineTo(canvas.width / 2 + 250, 335);
      ctx.stroke();

      // Body Text
      ctx.fillStyle = '#445159';
      ctx.font = '20px "Inter", sans-serif';
      const bodyText1 = `In recognition of commitment to community service, contributing`;
      const bodyText2 = `${hours} Attended Hour${hours === 1 ? '' : 's'} of Volunteering at Community Drives`;
      const bodyText3 = `as recorded by organizers on the HopeConnect AI demo platform.`;

      ctx.fillText(bodyText1, canvas.width / 2, 400);
      ctx.fillStyle = '#5B9A6A';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(bodyText2, canvas.width / 2, 440);
      ctx.fillStyle = '#445159';
      ctx.font = '20px "Inter", sans-serif';
      ctx.fillText(bodyText3, canvas.width / 2, 480);

      // Gold Seal
      drawGoldSeal(ctx, canvas.width / 2, 590);

      // Signatures & Date
      const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      // Left: Date
      ctx.textAlign = 'left';
      ctx.fillStyle = '#243038';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(todayStr, 140, 720);
      ctx.strokeStyle = '#A0AAB0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(140, 700);
      ctx.lineTo(340, 700);
      ctx.stroke();
      ctx.font = '14px "Inter", sans-serif';
      ctx.fillStyle = '#78848C';
      ctx.fillText('DATE OF ISSUANCE', 140, 742);

      // Right: Authorized Signature
      ctx.textAlign = 'right';
      ctx.fillStyle = '#243038';
      ctx.font = 'italic bold 22px "Brush Script MT", cursive, sans-serif';
      ctx.fillText('HopeConnect Team', canvas.width - 140, 690);
      ctx.strokeStyle = '#A0AAB0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width - 340, 700);
      ctx.lineTo(canvas.width - 140, 700);
      ctx.stroke();
      ctx.font = '14px "Inter", sans-serif';
      ctx.fillStyle = '#78848C';
      ctx.fillText('HOPECONNECT AI (DEMO)', canvas.width - 140, 742);

      // Certificate ID + honest demo disclaimer
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8E9CA4';
      ctx.font = '13px "Inter", sans-serif';
      ctx.fillText(`Certificate ID: ${certificateId}  •  Demo certificate generated in-browser. Not independently verified.`, canvas.width / 2, 785);
    }

    function drawCornerRibbon(ctx, x, y, flip = false) {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = '#E9B949';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(40, 0);
      ctx.lineTo(0, 40);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawGoldSeal(ctx, cx, cy) {
      ctx.save();
      // Starburst Outer
      ctx.fillStyle = '#E9B949';
      ctx.beginPath();
      ctx.arc(cx, cy, 46, 0, Math.PI * 2);
      ctx.fill();

      // Inner Circle
      ctx.fillStyle = '#FFFDF5';
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fill();

      // Text in Seal
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8C6A12';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('HOPE', cx, cy - 8);
      ctx.fillText('CONNECT', cx, cy + 5);
      ctx.fillText('★ ★ ★', cx, cy + 18);
      ctx.restore();
    }

    // A stable ID built from the name + hours, so the same inputs give the same ID
    function makeCertificateId(name, hours) {
      let hash = 0;
      for (const ch of `${name}|${hours}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      return 'HC-DEMO-' + hash.toString(36).toUpperCase().padStart(7, '0');
    }

    function currentHours() {
      return window.HCStore.getUserStats().volunteerHours;
    }

    function render(showToast = false) {
      const name = (nameInput.value.trim() || window.HCStore.getProfile().name || 'Volunteer').slice(0, 40);
      const hours = currentHours();
      drawCertificate(name, hours, makeCertificateId(name, hours));
      if (showToast) window.showToast(`Certificate preview updated for "${name}"`, 'info', 'fas fa-pen-nib');
    }

    nameInput.value = window.HCStore.getProfile().name || '';

    // Wait for web fonts so the canvas text uses the right typeface
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => render());

    updateBtn?.addEventListener('click', () => render(true));
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') render(true);
    });
    HC.onPage(document, 'hc:profile-changed', () => {
      nameInput.value = window.HCStore.getProfile().name || '';
      render();
    });

    downloadBtn?.addEventListener('click', () => {
      if (currentHours() === 0) {
        window.showToast('No attended hours yet. A certificate is available after an organizer confirms your attendance.', 'error', 'fas fa-info-circle');
        return;
      }
      render();
      const safeName = (nameInput.value.trim() || 'Volunteer').replace(/[^a-z0-9]+/gi, '_');
      const link = document.createElement('a');
      link.download = `HopeConnect_Certificate_${safeName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      window.showToast('Certificate downloaded (PNG).', 'success', 'fas fa-download');
    });
  }
})();
