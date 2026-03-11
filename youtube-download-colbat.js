// ==UserScript==
// @name         Youtube Cobalt Quick Download
// @namespace    https://cobalt.meowing.de/
// @version      1.0.0
// @description  Open cobalt.meowing.de with the URL all ready set
// @author       Black0S
// @match        https://www.youtube.com/watch*
// @match        https://youtu.be/*
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const RETRY_DELAY_MS       = 600;
  const SPA_NAVIGATION_DELAY = 1500;
  const COBALT_URL           = 'https://cobalt.meowing.de/';

  // ─────────────────────────────────────────────────────────────────────────────
  //  CSS
  // ─────────────────────────────────────────────────────────────────────────────

  const CSS = `
    .cbd-yt-btn {
      border: none; background: transparent; cursor: pointer;
      padding: 0; margin: 0; width: 48px; height: 48px;
      display: inline-flex; align-items: center; justify-content: center;
      position: relative; vertical-align: top;
      opacity: .75; transition: opacity .15s;
    }
    .cbd-yt-btn:hover { opacity: 1; }

    .cbd-yt-btn::after {
      content: 'Ouvrir dans Cobalt (meowing.de)';
      position: absolute; bottom: calc(100% + 8px); right: 0;
      background: rgba(28,28,28,.95); color: #fff;
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 11px; font-weight: 500;
      padding: 5px 9px; border-radius: 6px;
      white-space: nowrap; pointer-events: none;
      opacity: 0; transform: translateY(4px);
      transition: opacity .15s, transform .15s;
      border: 1px solid rgba(255,255,255,.08);
    }
    .cbd-yt-btn:hover::after {
      opacity: 1; transform: translateY(0);
    }

    .cbd-yt-btn.clicked svg {
      animation: cbd-pop .3s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes cbd-pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
  `;

  // ─────────────────────────────────────────────────────────────────────────────
  //  SVG ICON
  // ─────────────────────────────────────────────────────────────────────────────

  const ICON_SVG = `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4 L11 14" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.9"/>
      <path d="M6.5 10 L11 14.5 L15.5 10" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9"/>
      <path d="M4 16.5 L18 16.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.55"/>
    </svg>`;

  // ─────────────────────────────────────────────────────────────────────────────
  //  ACTION
  // ─────────────────────────────────────────────────────────────────────────────

  function openCobalt(btn) {
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 300);
    const target = COBALT_URL + '#' + encodeURIComponent(location.href);
    window.open(target, '_blank', 'noopener');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  INJECTION
  // ─────────────────────────────────────────────────────────────────────────────

  let activeBtn = null;

  function inject() {
    if (activeBtn) return;

    if (!document.querySelector('#cbd-style')) {
      const style = document.createElement('style');
      style.id = 'cbd-style';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    const player        = document.querySelector('#movie_player');
    const rightControls = player?.querySelector('.ytp-right-controls');
    if (!player || !rightControls) return;

    const btn = document.createElement('button');
    btn.className = 'cbd-yt-btn ytp-button';
    btn.title     = 'Ouvrir dans Cobalt';
    btn.innerHTML = ICON_SVG;
    btn.addEventListener('click', () => openCobalt(btn));
    rightControls.insertBefore(btn, rightControls.firstChild);
    activeBtn = btn;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  PLAYER-READY POLLING
  // ─────────────────────────────────────────────────────────────────────────────

  function tryInject() {
    const video  = document.querySelector('video');
    const player = document.querySelector('#movie_player');
    const ready  = video?.duration > 0 && player?.querySelector('.ytp-right-controls');
    if (ready) inject();
    else setTimeout(tryInject, RETRY_DELAY_MS);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  SPA NAVIGATION HANDLER
  // ─────────────────────────────────────────────────────────────────────────────

  function teardown() {
    if (!activeBtn) return;
    activeBtn.remove();
    activeBtn = null;
  }

  let lastUrl = location.href;
  const titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(() => {
      if (location.href === lastUrl) return;
      lastUrl = location.href;
      teardown();
      setTimeout(tryInject, SPA_NAVIGATION_DELAY);
    }).observe(titleEl, { childList: true });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  ENTRY POINT
  // ─────────────────────────────────────────────────────────────────────────────

  tryInject();

})();