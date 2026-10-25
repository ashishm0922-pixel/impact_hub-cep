/**
 * HopeConnect AI - No-reload navigation ("single-page app" feel)
 *
 * When you click a link to another page of this site, instead of a full browser reload we:
 *   1. fetch the next page's HTML in the background (often already prefetched on hover),
 *   2. swap the page content in place (the login modal, toasts and session stay),
 *   3. run that page's own scripts, and update the address bar + title.
 * Back/Forward buttons work, and if anything goes wrong we simply do a normal page load.
 *
 * Loaded on every page after auth.js.
 */
(() => {
  // Scripts that are loaded ONCE and stay for the whole visit
  const PERSISTENT_SCRIPTS = ['/core/constants.js', '/core/store.js', '/core/app.js', '/core/auth.js', '/core/router.js'];
  // Elements that survive navigation
  const PERSISTENT_IDS = ['toastContainer', 'authModal'];
  // Pages that should always load normally (separate app / opened from email)
  const FULL_RELOAD_PAGES = ['admin.html'];

  const cache = new Map(); // url → Promise<html>
  let navigating = 0; // increases on every navigation; stale responses are ignored

  if (!window.fetch || !window.history?.pushState || !window.DOMParser) return; // very old browser: normal links

  // Remember scroll position for Back/Forward
  history.replaceState({ hc: true, scrollY: window.scrollY }, '');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------------- Which links do we handle? ---------------- */
  function shouldHandle(link, event) {
    if (!link || event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false; // new tab etc.
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download') || link.dataset.noRouter !== undefined) return false;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    const file = url.pathname.split('/').pop() || 'index.html';
    if (!/\.html$/.test(file) && url.pathname !== '/' && !url.pathname.endsWith('/')) return false;
    if (FULL_RELOAD_PAGES.includes(file)) return false;

    // Same page, only the #hash differs → let the browser scroll normally
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
    return true;
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!shouldHandle(link, event)) return;
    event.preventDefault();
    navigate(link.href);
  });

  // Prefetch on hover / touch so the click feels instant
  const prefetch = (event) => {
    const link = event.target.closest?.('a[href]');
    if (link && shouldHandle(link, { button: 0 })) fetchPage(link.href).catch(() => {});
  };
  document.addEventListener('mouseover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });

  // Lets other scripts navigate without a reload: HC.go('pages/ngos.html')
  HC.navigate = (url) => navigate(url);

  window.addEventListener('popstate', (event) => {
    if (event.state?.hc) navigate(window.location.href, { push: false, scrollY: event.state.scrollY });
  });

  /* ---------------- Loading ---------------- */
  function fetchPage(url) {
    const key = url.split('#')[0];
    if (!cache.has(key)) {
      const request = fetch(key, { credentials: 'same-origin', headers: { Accept: 'text/html' } }).then(res => {
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.includes('text/html')) throw new Error(`Cannot load ${key} (${res.status})`);
        return res.text();
      });
      cache.set(key, request);
      request.catch(() => cache.delete(key));
      setTimeout(() => cache.delete(key), 30_000); // keep prefetched pages fresh
    }
    return cache.get(key);
  }

  const bar = document.createElement('div');
  bar.className = 'route-progress';
  document.documentElement.appendChild(bar);
  function progress(on) {
    bar.classList.toggle('active', on);
  }

  /* ---------------- Navigation ---------------- */
  async function navigate(url, { push = true, scrollY = 0 } = {}) {
    const id = ++navigating;
    progress(true);

    let html;
    try {
      html = await fetchPage(url);
    } catch {
      window.location.href = url; // fall back to a normal load
      return;
    }
    if (id !== navigating) return; // the user already clicked somewhere else

    const nextDoc = new DOMParser().parseFromString(html, 'text/html');
    if (!nextDoc.body) {
      window.location.href = url;
      return;
    }

    // Save where we were, then update the address bar BEFORE page scripts run
    // (they read things like ?category= from window.location)
    if (push) {
      history.replaceState({ hc: true, scrollY: window.scrollY }, '');
      history.pushState({ hc: true, scrollY: 0 }, '', url);
    }

    try {
      await swapPage(nextDoc);
    } catch (err) {
      console.error('No-reload navigation failed, loading normally:', err);
      window.location.href = url;
      return;
    }
    if (id !== navigating) return;

    // Scroll: Back/Forward → previous position; #hash → that section; otherwise top
    const hash = new URL(url, window.location.href).hash;
    const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView();
    else window.scrollTo(0, push ? 0 : scrollY);

    progress(false);
    // Move keyboard/screen-reader focus to the new content
    const main = document.querySelector('main, section');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  }

  async function swapPage(nextDoc) {
    // 0. The next page needs a stylesheet we haven't loaded (e.g. after an update)? A swap would look
    //    broken, so do a normal full page load instead (the caller falls back to that on any error).
    const loadedSheets = new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href')));
    for (const link of nextDoc.head.querySelectorAll('link[rel="stylesheet"]')) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !loadedSheets.has(href)) throw new Error(`New stylesheet needed: ${href}`);
    }

    // 1. Let the old page clean up its listeners and globals
    HC.cleanupPage();
    document.querySelectorAll('.modal-backdrop.active').forEach(m => window.closeModal(m.id));
    window.closeMobileMenu?.();

    // 2. Load any NEW external scripts from <head> (e.g. Chart.js on the Impact page)
    for (const script of nextDoc.head.querySelectorAll('script[src]')) {
      await loadScriptOnce(script.src);
    }

    // 3. Replace the page content, keeping the persistent elements
    const keep = PERSISTENT_IDS.map(id => document.getElementById(id)).filter(Boolean);
    const pageScripts = [...nextDoc.body.querySelectorAll('script')];
    pageScripts.forEach(s => s.remove());

    document.title = nextDoc.title;
    document.body.className = nextDoc.body.className;
    document.body.replaceChildren(...[...nextDoc.body.childNodes].map(node => document.importNode(node, true)));
    keep.forEach(el => document.body.appendChild(el));
    document.getElementById('verifyBanner')?.remove();

    // 4. Re-connect shared parts (header menu, login area, footer notice)
    document.dispatchEvent(new CustomEvent('hc:page-ready'));

    // 5. Run this page's own scripts, in order
    for (const script of pageScripts) {
      const src = script.getAttribute('src');
      if (src) {
        const absolute = new URL(src, window.location.href).href;
        if (PERSISTENT_SCRIPTS.some(path => absolute.includes(path))) {
          await loadScriptOnce(absolute); // already loaded → nothing happens
        } else {
          await runScript(absolute);
        }
      } else if (script.textContent.trim()) {
        const inline = document.createElement('script');
        inline.textContent = script.textContent;
        document.body.appendChild(inline);
      }
    }
  }

  const loadedScripts = new Set([...document.scripts].map(s => s.src && stripVersion(s.src)).filter(Boolean));

  function stripVersion(src) {
    return src.split('?')[0];
  }

  // Load a script only the first time it is needed
  function loadScriptOnce(src) {
    if (loadedScripts.has(stripVersion(src))) return Promise.resolve();
    loadedScripts.add(stripVersion(src));
    return runScript(src);
  }

  // Execute a script file (again) and wait until it has finished
  function runScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`Could not load ${src}`));
      document.body.appendChild(el);
    });
  }
})();
