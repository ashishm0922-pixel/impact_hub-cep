/**
 * HopeConnect AI - Participation Certificate (volunteers and donors only) (HTML5 Canvas)
 */

// Private scope: lets this script run again on every visit (no-reload navigation)
(() => {
  HC.ready(() => {
    initCertificateGenerator();
  });

  function initCertificateGenerator() {
    const canvas = document.getElementById('certificateCanvas');
    const status = document.getElementById('certStatus');
    const wrap = document.getElementById('certCanvasWrap');
    const actions = document.getElementById('certActions');
    const verifyLink = document.getElementById('certVerifyLink');
    const downloadBtn = document.getElementById('downloadCertBtn');

    if (!canvas || !status) return;

    const ctx = canvas.getContext('2d');

    function drawCertificate(cert) {
      const recipientName = cert.recipientName;
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
      const isVolunteer = cert.kind === 'volunteer';
      const bodyText1 = isVolunteer
        ? 'In recognition of commitment to community service, contributing'
        : 'In recognition of generosity towards community causes, supporting';
      const bodyText2 = isVolunteer
        ? `${cert.hours} Confirmed Hour${cert.hours === 1 ? '' : 's'} across ${cert.events} Volunteer Drive${cert.events === 1 ? '' : 's'}`
        : `${cert.campaigns} Campaign${cert.campaigns === 1 ? '' : 's'} with Pledges of ${HC.formatINR(cert.amount)}`;
      const bodyText3 = isVolunteer
        ? 'Hours were confirmed by the organising NGOs on HopeConnect AI.'
        : 'Pledges are demo pledges: no money has moved through HopeConnect AI.';

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
      const todayStr = new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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
      ctx.fillText('HOPECONNECT AI', canvas.width - 140, 742);

      // Certificate ID + where anyone can check it
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8E9CA4';
      ctx.font = '13px "Inter", sans-serif';
      ctx.fillText(`Certificate ID: ${cert.code}  •  Verify at ${verifyUrl(cert.code)}`, canvas.width / 2, 785);
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

    function verifyUrl(code) {
      return new URL(`${HC.page('verify-certificate.html')}?code=${encodeURIComponent(code)}`, window.location.href).href;
    }

    function showMessage(html) {
      status.hidden = false;
      status.innerHTML = html;
      wrap.hidden = true;
      actions.hidden = true;
    }

    let current = null;

    // Several events can ask for a reload at once; run one request at a time
    let loading = null;
    function load() {
      if (!loading) loading = loadCertificate().finally(() => { loading = null; });
      return loading;
    }

    async function loadCertificate() {
      const user = window.Auth?.user;
      const loginBtn = '<button type="button" class="btn btn-primary" data-auth="login"><i class="fas fa-sign-in-alt"></i> Log in</button>';
      if (!user) {
        return showMessage(`<p>Log in as a <strong>volunteer</strong> or <strong>donor</strong> to get your certificate.</p>${loginBtn}`);
      }
      if (user.role !== 'volunteer' && user.role !== 'donor') {
        return showMessage('<p>Participation certificates are for <strong>volunteers and donors</strong> only. NGO accounts do not receive one.</p>');
      }
      if (!user.emailVerified) {
        return showMessage('<p>Please verify your email first (use the link we sent you). Then your certificate can be created.</p>');
      }

      const { ok, status: code, data } = await HC.api('POST', '/api/me/certificate');
      if (!ok) {
        if (code === 409) {
          return showMessage(`<p><i class="fas fa-lock"></i> ${HC.escape(data.error)}</p>` +
            `<a class="btn btn-outline" href="${HC.escape(HC.page(user.role === 'volunteer' ? 'volunteer.html' : 'campaigns.html'))}">${user.role === 'volunteer' ? 'Find a drive' : 'See campaigns'}</a>`);
        }
        return showMessage(`<p>${HC.escape(data.error || 'Could not create your certificate. Please try again.')}</p>`);
      }
      current = data.certificate;
      status.hidden = true;
      wrap.hidden = false;
      actions.hidden = false;
      verifyLink.href = verifyUrl(current.code);
      verifyLink.textContent = current.code;
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => drawCertificate(current));
    }

    load();
    // A different person logged in or out: start again
    HC.onPage(document, 'hc:profile-changed', load);

    downloadBtn?.addEventListener('click', () => {
      if (!current) return;
      drawCertificate(current);
      const safeName = current.recipientName.replace(/[^a-z0-9]+/gi, '_');
      const link = document.createElement('a');
      link.download = `HopeConnect_Certificate_${safeName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      window.showToast('Certificate downloaded (PNG).', 'success', 'fas fa-download');
    });
  }
})();
