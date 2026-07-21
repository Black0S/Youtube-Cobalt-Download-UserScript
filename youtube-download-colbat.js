// ==UserScript==
// @name         Youtube Cobalt Quick Download
// @namespace    https://cobalt.meowing.de/
// @version      2.0.0
// @description  Open cobalt.meowing.de with the URL already set
// @author       Black0S
// @match        https://www.youtube.com/watch*
// @noframes
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  //  0.  SENTINEL
  // ═══════════════════════════════════════════════════════════════════════════

  const SENTINEL = '__cbd_injected__';
  if (window[SENTINEL]) return;
  window[SENTINEL] = true;

  // ═══════════════════════════════════════════════════════════════════════════
  //  1.  CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════

  const COBALT_URL   = 'https://cobalt.meowing.de/';
  const BTN_ID       = 'cbd-yt-btn';
  const POLL_MS      = 700;
  const NAV_DELAY_MS = 1600;
  const URL_CHECK_MS = 600;
  const MAX_POLLS    = 150;

  // ═══════════════════════════════════════════════════════════════════════════
  //  2.  CSS
  //      Une <style> est un sink CSS, pas HTML : textContent passe sans
  //      problème sous Trusted Types.
  // ═══════════════════════════════════════════════════════════════════════════

  const CSS = `
    #${BTN_ID} {
      border:none; background:transparent; cursor:pointer;
      padding:0; margin:0; width:44px; height:100%;
      display:inline-flex; align-items:center; justify-content:center;
      position:relative; vertical-align:top; flex:0 0 auto;
      opacity:.9; transition:opacity .15s;
    }
    #${BTN_ID}:hover { opacity:1; }
    #${BTN_ID} svg   { display:block; }

    #${BTN_ID}::after {
      content:'Ouvrir dans Cobalt';
      position:absolute; bottom:calc(100% + 6px); right:0;
      background:rgba(28,28,28,.95); color:#fff;
      font-family:'Roboto','YouTube Sans',Arial,sans-serif;
      font-size:11px; font-weight:500;
      padding:5px 9px; border-radius:6px;
      white-space:nowrap; pointer-events:none;
      opacity:0; transform:translateY(4px);
      transition:opacity .15s, transform .15s;
      border:1px solid rgba(255,255,255,.08);
      z-index:100;
    }
    #${BTN_ID}:hover::after { opacity:1; transform:translateY(0); }

    #${BTN_ID}.cbd-clicked svg {
      animation:cbd-pop .3s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes cbd-pop {
      0%   { transform:scale(1); }
      50%  { transform:scale(1.3); }
      100% { transform:scale(1); }
    }
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  //  3.  TRUSTED-TYPES-SAFE DOM HELPERS
  //
  //  Aucune chaîne HTML n'est jamais parsée : ni innerHTML, ni insertAdjacentHTML,
  //  ni DOMParser. Tout est construit via createElement / createElementNS.
  // ═══════════════════════════════════════════════════════════════════════════

  const NS_SVG = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS_SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /** Icône « télécharger » construite entièrement en DOM. */
  function buildIcon() {
    const svg = svgEl('svg', {
      width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none',
    });
    svg.appendChild(svgEl('path', {
      d: 'M11 4 L11 14',
      stroke: 'white', 'stroke-width': 1.8,
      'stroke-linecap': 'round', 'stroke-opacity': 0.9,
    }));
    svg.appendChild(svgEl('path', {
      d: 'M6.5 10 L11 14.5 L15.5 10',
      stroke: 'white', 'stroke-width': 1.8,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'stroke-opacity': 0.9,
    }));
    svg.appendChild(svgEl('path', {
      d: 'M4 16.5 L18 16.5',
      stroke: 'white', 'stroke-width': 1.8,
      'stroke-linecap': 'round', 'stroke-opacity': 0.55,
    }));
    return svg;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  4.  RÉSOLUTION DU PLAYER
  //
  //  Selon le build du player, la barre droite est soit .ytp-right-controls,
  //  soit scindée en .ytp-right-controls-left / -right. On essaie les deux.
  // ═══════════════════════════════════════════════════════════════════════════

  function getControlsBar() {
    return document.querySelector('.ytp-right-controls-left')
        || document.querySelector('.ytp-right-controls')
        || null;
  }

  function playerReady() {
    try { return !!(getControlsBar() && document.querySelector('video')); }
    catch { return false; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  5.  ACTION
  // ═══════════════════════════════════════════════════════════════════════════

  function openCobalt(btn) {
    btn.classList.add('cbd-clicked');
    setTimeout(() => btn.classList.remove('cbd-clicked'), 300);
    const target = COBALT_URL + '?u=' + encodeURIComponent(location.href);
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  6.  INJECTION
  // ═══════════════════════════════════════════════════════════════════════════

  let activeBtn = null;

  function inject() {
    if (activeBtn && activeBtn.isConnected) return;

    const bar = getControlsBar();
    if (!bar) return;

    if (!document.querySelector('#cbd-css')) {
      const style = document.createElement('style');
      style.id = 'cbd-css';
      style.textContent = CSS;   // sink CSS, pas HTML
      (document.head || document.documentElement).appendChild(style);
    }

    const btn = document.createElement('button');
    btn.id        = BTN_ID;
    btn.className = 'ytp-button';
    btn.title     = 'Ouvrir dans Cobalt';
    btn.setAttribute('aria-label', 'Ouvrir dans Cobalt');
    // YouTube masque les contrôles par priorité croissante quand la barre
    // manque de place. 1 = jamais masqué.
    btn.setAttribute('data-priority', '1');
    btn.appendChild(buildIcon());

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCobalt(btn);
    });

    try { bar.insertBefore(btn, bar.firstChild); }
    catch { bar.appendChild(btn); }

    activeBtn = btn;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  7.  TEARDOWN
  // ═══════════════════════════════════════════════════════════════════════════

  function teardown() {
    if (activeBtn) { try { activeBtn.remove(); } catch {} }
    activeBtn = null;
    polls = 0;
    if (domObserver) { domObserver.disconnect(); domObserver = null; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  8.  POLLING + DOM WATCHER
  // ═══════════════════════════════════════════════════════════════════════════

  let polls = 0;
  let domObserver = null;

  function tryInject() {
    if (activeBtn && activeBtn.isConnected) return;
    if (polls++ > MAX_POLLS) return;
    if (playerReady()) inject();
    else setTimeout(tryInject, POLL_MS);
  }

  /** Réinjecte dès que YouTube reconstruit la barre (pubs, plein écran…). */
  function watchForControls() {
    if (domObserver) { domObserver.disconnect(); domObserver = null; }
    const target = document.body || document.documentElement;
    domObserver = new MutationObserver(() => {
      if (activeBtn && activeBtn.isConnected) return;
      if (!playerReady()) return;
      inject();
    });
    domObserver.observe(target, { childList: true, subtree: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  9.  DÉTECTION DE NAVIGATION SPA  (3 couches, débouncées)
  // ═══════════════════════════════════════════════════════════════════════════

  let _navTimer = null;

  function onNav() {
    if (_navTimer) return;
    _navTimer = setTimeout(() => {
      _navTimer = null;
      teardown();
      if (location.pathname.startsWith('/watch')) {
        setTimeout(() => { watchForControls(); tryInject(); }, NAV_DELAY_MS);
      }
    }, 50);
  }

  // Couche 1 — événement natif YouTube
  document.addEventListener('yt-navigate-finish', onNav);
  window.addEventListener('yt-navigate-finish',   onNav);

  // Couche 2 — polling d'URL
  let _lastHref = location.href;
  setInterval(() => {
    if (location.href !== _lastHref) { _lastHref = location.href; onNav(); }
  }, URL_CHECK_MS);

  // Couche 3 — observateur sur <title>
  (function watchTitle() {
    const t = document.querySelector('title');
    if (!t) { setTimeout(watchTitle, 400); return; }
    let _last = location.href;
    new MutationObserver(() => {
      if (location.href === _last) return;
      _last = location.href;
      onNav();
    }).observe(t, { childList: true });
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  //  10.  BOOT
  // ═══════════════════════════════════════════════════════════════════════════

  watchForControls();
  tryInject();

})();