// ==UserScript==
// @name         YouTube Channel Tab Video Filter (Next to Last Tab) - Auto Reset
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Add a filter box after the last channel tab to hide/show videos by title text on YouTube channel pages. Auto-clears when switching tabs or URL changes.
// @author       haroro107
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const UI_ID = 'yt-channel-filter-ui-v2';
  let currentQuery = '';
  let lastPath = location.pathname + location.search + location.hash;

  // --- Utility: dispatch locationchange when SPA navigation happens ---
  (function patchHistoryEvents() {
    const _wr = (type) => {
      const orig = history[type];
      return function () {
        const rv = orig.apply(this, arguments);
        window.dispatchEvent(new Event('locationchange'));
        return rv;
      };
    };
    history.pushState = _wr('pushState');
    history.replaceState = _wr('replaceState');
    window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));
  })();

  // --- attach UI ---
  function attachUI() {
    // Avoid re-creating if exists
    if (document.getElementById(UI_ID)) return;

    // Find the last tab (with search form inside)
    const lastTab = document.querySelector('yt-tab-shape.yt-tab-shape-wiz__tab--last-tab');
    if (!lastTab) return;

    const container = document.createElement('div');
    container.id = UI_ID;
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.marginLeft = '12px';
    container.style.gap = '6px';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Filter titles (tokens)';
    input.style.minWidth = '240px';
    input.style.padding = '6px 8px';
    input.style.borderRadius = '6px';
    input.style.border = '1px solid rgba(255,255,255,0.2)';
    input.style.background = 'transparent';
    input.style.color = 'var(--yt-spec-text-primary)';
    input.style.outline = 'none';

    const btn = document.createElement('button');
    btn.textContent = 'Filter';
    styleBtn(btn);

    const clr = document.createElement('button');
    clr.textContent = 'Clear';
    styleBtn(clr);

    container.appendChild(input);
    container.appendChild(btn);
    container.appendChild(clr);

    // Insert after the last tab
    lastTab.insertAdjacentElement('afterend', container);

    btn.addEventListener('click', () => {
      currentQuery = input.value.trim();
      applyFilter(currentQuery);
    });

    clr.addEventListener('click', () => {
      resetFilterUI();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        currentQuery = input.value.trim();
        applyFilter(currentQuery);
      }
    });

    // If we have an active filter (rare), reapply it
    if (currentQuery) input.value = currentQuery;
  }

  function styleBtn(b) {
    b.style.padding = '6px 10px';
    b.style.border = 'none';
    b.style.borderRadius = '6px';
    b.style.cursor = 'pointer';
    b.style.background = 'var(--yt-spec-call-to-action)';
    b.style.color = 'var(--yt-spec-text-primary-inverse)';
  }

  function getTitleText(item) {
    const el = item.querySelector('#video-title, a#video-title-link, a#video-title');
    if (el) return (el.textContent || el.title || '').trim();
    return '';
  }

  function matches(title, query) {
    if (!query) return true;
    const tokens = query.split(/\s+/).filter(Boolean);
    const lowerTitle = title.toLowerCase();
    return tokens.every(t => lowerTitle.includes(t.toLowerCase()));
  }

  function applyFilter(query) {
    document.querySelectorAll('ytd-rich-item-renderer,ytd-grid-video-renderer,ytd-video-renderer').forEach(item => {
      const title = getTitleText(item);
      if (!matches(title, query)) {
        item.style.display = 'none';
      } else {
        item.style.removeProperty('display');
      }
    });
  }

  function resetFilterUI() {
    const container = document.getElementById(UI_ID);
    if (container) {
      const input = container.querySelector('input[type="text"]');
      if (input) input.value = '';
    }
    currentQuery = '';
    applyFilter('');
  }

  // --- Observe DOM changes to attach UI and reapply filter as needed ---
  const observer = new MutationObserver(() => {
    attachUI();
    if (currentQuery) applyFilter(currentQuery);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // --- On SPA navigation or YouTube specific navigation finish, reset if path changed ---
  function handleMaybeReset() {
    const nowPath = location.pathname + location.search + location.hash;
    if (nowPath !== lastPath) {
      lastPath = nowPath;
      // Clear the UI and filter when path changes (user moved between /videos, /streams, /posts, etc.)
      resetFilterUI();
      // Re-attach UI after navigation (some elements may not be present instantly)
      setTimeout(() => attachUI(), 400);
    } else {
      // same path — do not reset (prevents clearing on infinite scroll)
      // but still reattach if missing
      attachUI();
      if (currentQuery) applyFilter(currentQuery);
    }
  }

  window.addEventListener('locationchange', handleMaybeReset);
  window.addEventListener('yt-navigate-finish', handleMaybeReset);

  // Also handle initial load (in case the script runs after navigation)
  setTimeout(() => {
    attachUI();
    // No reset on first load, but store path
    lastPath = location.pathname + location.search + location.hash;
  }, 600);

})();
