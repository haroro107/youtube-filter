// ==UserScript==
// @name         YouTube Channel Tab Video Filter
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Add a filter box after the last channel tab to hide/show videos by title text on YouTube channel pages.
// @author       haroro107
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const UI_ID = 'yt-channel-filter-ui-v2';
  let currentQuery = '';

  function attachUI() {
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
      input.value = '';
      currentQuery = '';
      applyFilter('');
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        currentQuery = input.value.trim();
        applyFilter(currentQuery);
      }
    });
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
    if (el) return el.textContent.trim() || el.title || '';
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

  // MutationObserver to re-attach UI on navigation/infinite scroll
  const observer = new MutationObserver(() => {
    attachUI();
    if (currentQuery) applyFilter(currentQuery);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('yt-navigate-finish', () => {
    setTimeout(() => {
      attachUI();
      if (currentQuery) applyFilter(currentQuery);
    }, 600);
  });
})();
