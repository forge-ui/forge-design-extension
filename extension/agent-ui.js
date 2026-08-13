/**
 * Forge Design — dark cursor favicon + subtle top glow bar
 */
(function () {
  if (window.__gcbAgentUi) return;
  window.__gcbAgentUi = true;

  let enabled = false;
  let faviconHref = null;
  let faviconTimer = null;
  let headObserver = null;
  let applyingFavicon = false;
  let scanEl = null;
  let cursorEl = null;
  let cursorLabelEl = null;
  const CURSOR_POSITION_KEY = '__gcbAgentCursorPosition';
  let savedCursorPosition = null;
  try {
    savedCursorPosition = JSON.parse(sessionStorage.getItem(CURSOR_POSITION_KEY) || 'null');
  } catch {}
  let cursorX = Number.isFinite(savedCursorPosition?.x)
    ? savedCursorPosition.x
    : Math.round(window.innerWidth / 2);
  let cursorY = Number.isFinite(savedCursorPosition?.y)
    ? savedCursorPosition.y
    : Math.round(window.innerHeight / 2);
  let scrollOutTimer = null;
  let scrollBackTimer = null;
  let interactionObserver = null;
  let lastAutoPointAt = 0;
  let lastAutoPointElement = null;

  function buildFaviconPng() {
    try {
      const size = 64;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) return null;

      // transparent bg so it looks like a real tab icon
      ctx.clearRect(0, 0, size, size);

      // Codex-like dark filled cursor (arrow pointer)
      // Classic OS cursor shape, dark charcoal
      ctx.save();
      ctx.translate(10, 8);
      ctx.beginPath();
      // tip at top-left
      ctx.moveTo(2, 2);
      ctx.lineTo(2, 42);
      ctx.lineTo(12, 32);
      ctx.lineTo(20, 48);
      ctx.lineTo(26, 45);
      ctx.lineTo(18, 29);
      ctx.lineTo(34, 29);
      ctx.closePath();

      // fill dark
      ctx.fillStyle = '#2f2f2f';
      ctx.fill();
      // subtle light edge so it reads on dark tab bars
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#5a5a5a';
      ctx.stroke();
      // soft inner highlight on left edge (like Codex)
      ctx.beginPath();
      ctx.moveTo(4, 6);
      ctx.lineTo(4, 36);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      return c.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  function ensureFaviconHref() {
    if (!faviconHref) faviconHref = buildFaviconPng();
    return faviconHref;
  }

  function ensureScan() {
    if (scanEl && document.documentElement.contains(scanEl)) return;
    const mount = document.documentElement || document.body;
    scanEl = document.createElement('div');
    scanEl.id = 'gcb-agent-scan';
    scanEl.setAttribute('aria-hidden', 'true');
    mount.appendChild(scanEl);
  }

  function showShimmer(on) {
    // soft L→R gauze sweep (phone-AI demo style)
    if (on) {
      ensureScan();
      scanEl.style.display = 'block';
    } else if (scanEl) {
      scanEl.style.display = 'none';
    }
  }

  const CURSOR_TRANSITION_MS = 420;

  function applyCursorBaseStyles(cursor) {
    // Inline critical styles so the cursor stays visible even if page CSS
    // fights us or agent-ui.css failed to inject (common on strict SPAs).
    cursor.style.setProperty('position', 'fixed', 'important');
    cursor.style.setProperty('top', '0', 'important');
    cursor.style.setProperty('left', '0', 'important');
    cursor.style.setProperty('width', '0', 'important');
    cursor.style.setProperty('height', '0', 'important');
    cursor.style.setProperty('z-index', '2147483647', 'important');
    cursor.style.setProperty('pointer-events', 'none', 'important');
    cursor.style.setProperty('margin', '0', 'important');
    cursor.style.setProperty('padding', '0', 'important');
    cursor.style.setProperty('border', 'none', 'important');
    cursor.style.setProperty('background', 'transparent', 'important');
    cursor.style.setProperty('overflow', 'visible', 'important');
    cursor.style.setProperty(
      'transition',
      `transform ${CURSOR_TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease`,
      'important'
    );
    cursor.style.setProperty('will-change', 'transform', 'important');
  }

  function ensureCursor() {
    const mount = document.documentElement || document.body;
    if (!mount) return null;
    if (cursorEl && mount.contains(cursorEl)) {
      applyCursorBaseStyles(cursorEl);
      return cursorEl;
    }
    // Prefer reusing a leftover node from a previous inject.
    const existing = document.getElementById('gcb-agent-cursor');
    if (existing) {
      cursorEl = existing;
      cursorLabelEl = cursorEl.querySelector('.gcb-agent-cursor-label');
      applyCursorBaseStyles(cursorEl);
      return cursorEl;
    }
    cursorEl = document.createElement('div');
    cursorEl.id = 'gcb-agent-cursor';
    cursorEl.setAttribute('aria-hidden', 'true');
    cursorEl.innerHTML =
      '<span class="gcb-agent-cursor-arrow"><svg viewBox="0 0 24 32" width="23" height="30" aria-hidden="true"><path d="M2.25 1.75v24.1l6.05-5.12 4.15 9.02 4.05-1.88-4.1-8.9h8.05L2.25 1.75Z" fill="#080808" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg></span><span class="gcb-agent-cursor-ring"></span><span class="gcb-agent-cursor-label"></span>';
    applyCursorBaseStyles(cursorEl);
    cursorEl.style.setProperty('opacity', '0', 'important');
    cursorEl.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    mount.appendChild(cursorEl);
    cursorLabelEl = cursorEl.querySelector('.gcb-agent-cursor-label');
    return cursorEl;
  }

  function keepCursorVisible() {
    const cursor = ensureCursor();
    if (!cursor) return;
    cursor.classList.add('gcb-agent-cursor-visible');
    cursor.style.setProperty('opacity', '1', 'important');
    cursor.style.setProperty('visibility', 'visible', 'important');
    cursor.style.setProperty('display', 'block', 'important');
  }

  function setCursorLabel(label) {
    ensureCursor();
    if (!cursorLabelEl) return;
    cursorLabelEl.textContent = label || '';
    cursorLabelEl.style.display = label ? 'block' : 'none';
  }

  function moveCursor(x, y, options = {}) {
    // Only move when agent mode is already on. Never auto-enable here:
    // content scripts load on every tab, and user clicks must not turn a
    // normal browsing tab into an agent tab.
    if (!enabled) return null;
    const cursor = ensureCursor();
    if (!cursor) return null;
    const safeX = Math.max(4, Math.min(window.innerWidth - 4, Number(x) || 0));
    const safeY = Math.max(4, Math.min(window.innerHeight - 4, Number(y) || 0));
    const fromX = cursorX;
    const fromY = cursorY;
    // If already on target, nudge slightly so the CSS transition still runs
    // and the user can see the pointer "arrive".
    if (Math.abs(safeX - fromX) < 2 && Math.abs(safeY - fromY) < 2) {
      const nudgeX = Math.max(4, Math.min(window.innerWidth - 4, safeX - 18));
      cursor.style.transition = 'none';
      cursor.style.transform = `translate3d(${nudgeX}px, ${safeY}px, 0)`;
      void cursor.offsetWidth;
      applyCursorBaseStyles(cursor);
    }
    cursorX = safeX;
    cursorY = safeY;
    try {
      sessionStorage.setItem(CURSOR_POSITION_KEY, JSON.stringify({ x: safeX, y: safeY }));
    } catch {}
    cursor.style.transform = `translate3d(${safeX}px, ${safeY}px, 0)`;
    setCursorLabel(options.label || '');
    keepCursorVisible();
    // Re-mount at end of <html> so x.com stacking / portal layers cannot cover it.
    const mount = document.documentElement || document.body;
    if (mount && cursor.parentNode === mount && mount.lastElementChild !== cursor) {
      mount.appendChild(cursor);
    }
    return { x: safeX, y: safeY, fromX, fromY };
  }

  /**
   * Move cursor and resolve only after the transition has finished (or timeout).
   * content.js must await this before dispatching click events.
   */
  function moveCursorAsync(x, y, options = {}) {
    return new Promise((resolve) => {
      const pos = moveCursor(x, y, options);
      if (!pos) {
        resolve(null);
        return;
      }
      const cursor = cursorEl;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cursor?.removeEventListener('transitionend', onEnd);
        resolve(pos);
      };
      const onEnd = (event) => {
        if (event.target !== cursor) return;
        if (event.propertyName && event.propertyName !== 'transform') return;
        finish();
      };
      cursor?.addEventListener('transitionend', onEnd);
      // Fallback: transitionend is flaky when distance is tiny or tab is backgrounded.
      setTimeout(finish, CURSOR_TRANSITION_MS + 80);
    });
  }

  function showClick() {
    if (!enabled) return;
    const cursor = ensureCursor();
    if (!cursor) return;
    keepCursorVisible();
    showActivity();
    cursor.classList.remove('gcb-agent-cursor-click');
    void cursor.offsetWidth;
    cursor.classList.add('gcb-agent-cursor-click');
    setTimeout(() => cursor?.classList.remove('gcb-agent-cursor-click'), 520);
  }

  function showActivity() {
    if (!enabled) return;
    const cursor = ensureCursor();
    if (!cursor) return;
    keepCursorVisible();
    cursor.classList.remove('gcb-agent-cursor-wiggle');
    void cursor.offsetWidth;
    cursor.classList.add('gcb-agent-cursor-wiggle');
    setTimeout(() => cursor?.classList.remove('gcb-agent-cursor-wiggle'), 560);
  }

  function showScroll(direction = 1) {
    if (!enabled) return;
    const cursor = ensureCursor();
    if (!cursor) return;
    keepCursorVisible();
    clearTimeout(scrollOutTimer);
    clearTimeout(scrollBackTimer);
    cursor.classList.remove('gcb-agent-cursor-scroll-return');
    cursor.classList.add('gcb-agent-cursor-scroll-out');
    const offset = direction < 0 ? -60 : 60;
    const virtualY = Math.max(8, Math.min(window.innerHeight - 8, cursorY + offset));
    cursor.style.transform = `translate3d(${cursorX}px, ${virtualY}px, 0)`;
    scrollOutTimer = setTimeout(() => {
      cursor.classList.remove('gcb-agent-cursor-scroll-out');
      cursor.classList.add('gcb-agent-cursor-scroll-return');
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      scrollBackTimer = setTimeout(() => {
        cursor?.classList.remove('gcb-agent-cursor-scroll-return');
      }, 260);
    }, 190);
  }

  function pointAtSelector(selector, options = {}) {
    if (!selector) return null;
    let el;
    try {
      el = document.querySelector(selector);
    } catch {
      return null;
    }
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    return moveCursor(rect.left + rect.width / 2, rect.top + rect.height / 2, options);
  }

  function pointAtClickTarget(event) {
    // Only mirror page clicks while agent mode is active on THIS tab.
    // Never enable from a normal user click — that previously hijacked every tab
    // the content script was injected into.
    if (!enabled) return;
    // Bridge-driven clicks already move the cursor and wait for arrival before
    // firing pointer events — skip reactive re-pointing to avoid a second jump.
    if (window.__gcbBridgeClicking) return;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const rawTarget = path.find((node) => node instanceof Element) || event.target;
    if (!(rawTarget instanceof Element) || rawTarget.closest?.('#gcb-agent-cursor, #gcb-agent-scan')) return;
    const el = rawTarget.closest(
      'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], [data-testid]'
    ) || rawTarget;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      moveCursor(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      moveCursor(event.clientX, event.clientY);
    }
    showClick();
  }

  function isInteractiveStateChange(el, attributeName, oldValue) {
    if (!(el instanceof Element)) return false;
    const value = attributeName ? el.getAttribute(attributeName) : null;
    if (value === oldValue) return false;
    if (attributeName === 'aria-selected') return value === 'true';
    if (attributeName === 'aria-expanded') return value === 'true';
    if (attributeName === 'aria-current') return value != null && value !== 'false';
    if (attributeName === 'data-state') return ['active', 'checked', 'open', 'on', 'selected'].includes(value);
    if (attributeName === 'data-selected') return value != null && value !== 'false';
    if (attributeName === 'class') {
      const role = el.getAttribute('role');
      return ['menuitem', 'option', 'tab', 'treeitem'].includes(role) && el.matches(':focus, [aria-selected="true"], [aria-expanded="true"], [data-state="active"], [data-state="open"]');
    }
    return false;
  }

  function pointAtStateElement(el) {
    if (!enabled || !(el instanceof Element) || el.closest?.('#gcb-agent-cursor, #gcb-agent-scan')) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const now = performance.now();
    if (lastAutoPointElement === el && now - lastAutoPointAt < 450) return;
    lastAutoPointElement = el;
    lastAutoPointAt = now;
    moveCursor(rect.left + rect.width / 2, rect.top + rect.height / 2);
    showActivity();
  }

  function startInteractionObserver() {
    if (interactionObserver || !document.documentElement) return;
    interactionObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes') continue;
        const el = mutation.target;
        if (isInteractiveStateChange(el, mutation.attributeName, mutation.oldValue)) {
          pointAtStateElement(el);
          break;
        }
      }
    });
    interactionObserver.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['aria-selected', 'aria-expanded', 'aria-current', 'data-state', 'data-selected', 'class'],
      subtree: true,
    });
  }

  function applyFavicon() {
    if (!enabled || applyingFavicon) return;
    const href = ensureFaviconHref();
    if (!href || !document.head) return;
    applyingFavicon = true;
    try {
      document
        .querySelectorAll(
          'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"], link[rel*="icon"]'
        )
        .forEach((el) => {
          if (el.dataset && el.dataset.gcb === '1') return;
          try {
            el.remove();
          } catch {
            try {
              el.href = href;
            } catch {}
          }
        });

      let link = document.getElementById('gcb-agent-favicon');
      if (!link) {
        link = document.createElement('link');
        link.id = 'gcb-agent-favicon';
        link.dataset.gcb = '1';
        link.rel = 'icon';
        link.type = 'image/png';
        link.sizes = '32x32';
      }
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
      if (link.parentNode !== document.head || document.head.firstChild !== link) {
        if (link.parentNode) link.parentNode.removeChild(link);
        document.head.insertBefore(link, document.head.firstChild);
      }

      let link2 = document.getElementById('gcb-agent-favicon-shortcut');
      if (!link2) {
        link2 = document.createElement('link');
        link2.id = 'gcb-agent-favicon-shortcut';
        link2.dataset.gcb = '1';
        link2.rel = 'shortcut icon';
        link2.type = 'image/png';
      }
      if (link2.getAttribute('href') !== href) link2.setAttribute('href', href);
      if (!link2.parentNode) {
        document.head.insertBefore(link2, document.head.firstChild);
      }
    } catch {}
    applyingFavicon = false;
  }

  function startGuards() {
    showShimmer(true);
    applyFavicon();
    if (!headObserver && document.head) {
      headObserver = new MutationObserver(() => {
        if (!enabled || applyingFavicon) return;
        applyFavicon();
      });
      headObserver.observe(document.head, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'rel'],
      });
    }
    if (!faviconTimer) {
      faviconTimer = setInterval(() => {
        if (enabled) applyFavicon();
      }, 600);
    }
  }

  function stopGuards() {
    showShimmer(false);
    if (headObserver) {
      headObserver.disconnect();
      headObserver = null;
    }
    if (faviconTimer) {
      clearInterval(faviconTimer);
      faviconTimer = null;
    }
  }

  let pageListenersAttached = false;

  function onFocusIn(event) {
    pointAtStateElement(event.target);
  }

  function attachPageListeners() {
    if (pageListenersAttached) return;
    pageListenersAttached = true;
    // Mirror in-page clicks only while agent mode is on (agent tab / automation).
    window.addEventListener('pointerdown', pointAtClickTarget, true);
    window.addEventListener('focusin', onFocusIn, true);
  }

  function detachPageListeners() {
    if (!pageListenersAttached) return;
    pageListenersAttached = false;
    window.removeEventListener('pointerdown', pointAtClickTarget, true);
    window.removeEventListener('focusin', onFocusIn, true);
  }

  function setEnabled(on) {
    enabled = !!on;
    if (enabled) {
      startGuards();
      startInteractionObserver();
      attachPageListeners();
      ensureCursor();
      keepCursorVisible();
    } else {
      stopGuards();
      detachPageListeners();
      interactionObserver?.disconnect();
      interactionObserver = null;
      if (cursorEl) {
        cursorEl.classList.remove('gcb-agent-cursor-visible');
        // Keep node; only hide. Next move re-shows it.
        cursorEl.style.setProperty('opacity', '0', 'important');
      }
      if (scanEl) {
        try {
          scanEl.remove();
        } catch {}
        scanEl = null;
      }
    }
  }

  window.__gcbAgent = {
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    isEnabled: () => enabled,
    applyFavicon,
    applyTitle() {},
    setCommand() {},
    moveCursor,
    moveCursorAsync,
    showClick,
    showActivity,
    showScroll,
    pointAtSelector,
    notifyAction() {
      // Explicit bridge action only — never enable from passive page events.
      setEnabled(true);
    },
  };

  // Default: disabled on every page (content scripts inject into <all_urls>).
  // Only an explicit background message enables agent UI — never page load alone,
  // never a normal user click. That prevents hijacking the tab the user is using.
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === 'agent-ui' || msg.type === 'agent-ui-enable') {
      if (msg.enabled === false) setEnabled(false);
      else {
        setEnabled(true);
        if (msg.args?.selector) {
          pointAtSelector(msg.args.selector, { label: msg.command || '' });
        }
      }
      sendResponse?.({ ok: true });
      return true;
    }
  });
})();
