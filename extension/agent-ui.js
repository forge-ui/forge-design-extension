/**
 * Forge Design — washed original favicon + rounded mouse overlay
 * and a visible automation pointer on the page.
 */
(function () {
  if (window.__gcbAgentUi) return;
  window.__gcbAgentUi = true;

  let enabled = false;
  let faviconHref = null;
  let faviconBuild = null;
  let faviconTimer = null;
  let headObserver = null;
  let applyingFavicon = false;
  let applyFaviconQueued = false;
  let originalFaviconHref = null;
  let originalIconSnapshots = [];
  let faviconGeneration = 0;
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

  const ICON_LINK_SELECTOR =
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"], link[rel*="icon"]';
  // Rounded mouse pointer from the user's icon (1024 viewBox, tip up-left).
  const CURSOR_PATH =
    'M174.08 113.39264l7.43424 646.56896c0.38912 33.95072 28.11392 61.1584 61.9264 60.76416a61.07136 61.07136 0 0 0 39.38816-15.01696l156.65152-136.36096 159.73376 277.82656c16.90624 29.39904 54.3488 39.4752 83.63008 22.49728l67.11296-38.912c29.2864-16.9728 39.31648-54.57408 22.41024-83.97312l-159.73376-277.82656 196.06016-68.096c31.95392-11.10016 48.896-46.11072 37.84704-78.19776a61.42464 61.42464 0 0 0-26.59328-32.75776L266.56256 59.83232c-29.06624-17.34144-66.63168-7.7312-83.89632 21.45792A61.71648 61.71648 0 0 0 174.08 113.39264z';
  const CURSOR_SVG =
    '<svg viewBox="150 40 680 880" width="23" height="30" aria-hidden="true"><path d="M174.08 113.39264l7.43424 646.56896c0.38912 33.95072 28.11392 61.1584 61.9264 60.76416a61.07136 61.07136 0 0 0 39.38816-15.01696l156.65152-136.36096 159.73376 277.82656c16.90624 29.39904 54.3488 39.4752 83.63008 22.49728l67.11296-38.912c29.2864-16.9728 39.31648-54.57408 22.41024-83.97312l-159.73376-277.82656 196.06016-68.096c31.95392-11.10016 48.896-46.11072 37.84704-78.19776a61.42464 61.42464 0 0 0-26.59328-32.75776L266.56256 59.83232c-29.06624-17.34144-66.63168-7.7312-83.89632 21.45792A61.71648 61.71648 0 0 0 174.08 113.39264z" fill="#111" stroke="#fff" stroke-width="72" stroke-linejoin="round" stroke-linecap="round"/></svg>';

  function isOurs(el) {
    return el?.dataset?.gcb === '1' || el?.id === 'gcb-agent-favicon' || el?.id === 'gcb-agent-favicon-shortcut';
  }

  function pickOriginalFaviconHref(links) {
    const scored = links
      .map((el) => {
        const rel = (el.getAttribute('rel') || '').toLowerCase();
        const href = el.href || el.getAttribute('href') || '';
        if (!href) return null;
        const sizes = (el.getAttribute('sizes') || '').toLowerCase();
        let score = 0;
        if (rel.includes('apple-touch') || rel.includes('mask-icon')) score -= 20;
        if (/\b32x32\b/.test(sizes)) score += 40;
        else if (/\b48x48\b/.test(sizes)) score += 30;
        else if (/\b16x16\b/.test(sizes)) score += 25;
        else if (/\b64x64\b/.test(sizes) || /\b96x96\b/.test(sizes)) score += 15;
        if (rel === 'icon' || rel.split(/\s+/).includes('icon')) score += 10;
        if (/\.ico(\?|$)/i.test(href)) score += 5;
        return { href, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.href || new URL('/favicon.ico', location.href).href;
  }

  function snapshotOriginalIcons() {
    const links = [...document.querySelectorAll(ICON_LINK_SELECTOR)].filter((el) => !isOurs(el));
    if (!links.length) {
      if (!originalFaviconHref) originalFaviconHref = new URL('/favicon.ico', location.href).href;
      return;
    }
    const href = pickOriginalFaviconHref(links);
    if (href === originalFaviconHref && originalIconSnapshots.length) return;
    originalFaviconHref = href;
    originalIconSnapshots = links.map((el) => ({
      rel: el.getAttribute('rel') || 'icon',
      href: el.href || el.getAttribute('href') || '',
      type: el.getAttribute('type') || '',
      sizes: el.getAttribute('sizes') || '',
    }));
    faviconHref = null;
    faviconBuild = null;
    faviconGeneration += 1;
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawWashedOriginal(ctx, image, size) {
    const pad = Math.round(size * 0.1);
    const x = pad;
    const y = pad;
    const w = size - pad * 2;
    const h = size - pad * 2;
    const radius = Math.round(size * 0.2);
    const iw = image.width || size;
    const ih = image.height || size;
    if (!iw || !ih) return;

    ctx.save();
    roundedRectPath(ctx, x, y, w, h, radius);
    ctx.shadowColor = 'rgba(59, 130, 246, 0.88)';
    ctx.shadowBlur = size * 0.28;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.22)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.globalAlpha = 0.52;
    ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, x + 0.6, y + 0.6, w - 1.2, h - 1.2, Math.max(1, radius - 0.4));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2.5, size * 0.07);
    ctx.stroke();
    ctx.restore();
  }

  function drawCursorOverlay(ctx, size) {
    const path = new Path2D(CURSOR_PATH);
    ctx.save();
    const scale = size / 920;
    ctx.translate(size * 0.08, size * 0.05);
    ctx.scale(scale, scale);
    ctx.translate(-150, -40);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 140;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 72;
    ctx.stroke(path);
    ctx.fillStyle = '#111';
    ctx.fill(path);
    ctx.restore();
  }

  async function loadFaviconImage(url) {
    if (url.startsWith('data:')) {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('favicon data image failed'));
        img.src = url;
      });
    }
    const sameOrigin = (() => {
      try {
        return new URL(url, location.href).origin === location.origin;
      } catch {
        return false;
      }
    })();
    const res = await fetch(url, {
      credentials: sameOrigin ? 'include' : 'omit',
      cache: 'force-cache',
    });
    if (!res.ok) throw new Error(`favicon ${res.status}`);
    const blob = await res.blob();
    try {
      return await createImageBitmap(blob);
    } catch {
      const objUrl = URL.createObjectURL(blob);
      try {
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('favicon image failed'));
          img.src = objUrl;
        });
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    }
  }

  async function buildFaviconPng() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, size, size);

    if (originalFaviconHref) {
      try {
        const image = await loadFaviconImage(originalFaviconHref);
        drawWashedOriginal(ctx, image, size);
        image.close?.();
      } catch {
        // No original (CORS / 404) — cursor-only, same as before.
      }
    }
    drawCursorOverlay(ctx, size);
    return c.toDataURL('image/png');
  }

  function ensureFaviconHref() {
    if (faviconHref) return Promise.resolve(faviconHref);
    if (!faviconBuild) {
      const gen = faviconGeneration;
      faviconBuild = buildFaviconPng()
        .then((href) => {
          if (gen !== faviconGeneration) return ensureFaviconHref();
          faviconHref = href;
          return href;
        })
        .finally(() => {
          faviconBuild = null;
        });
    }
    return faviconBuild;
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
      const arrow = cursorEl.querySelector('.gcb-agent-cursor-arrow');
      if (arrow) arrow.innerHTML = CURSOR_SVG;
      cursorLabelEl = cursorEl.querySelector('.gcb-agent-cursor-label');
      applyCursorBaseStyles(cursorEl);
      return cursorEl;
    }
    cursorEl = document.createElement('div');
    cursorEl.id = 'gcb-agent-cursor';
    cursorEl.setAttribute('aria-hidden', 'true');
    cursorEl.innerHTML =
      `<span class="gcb-agent-cursor-arrow">${CURSOR_SVG}</span><span class="gcb-agent-cursor-ring"></span><span class="gcb-agent-cursor-label"></span>`;
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
    if (!(rawTarget instanceof Element) || rawTarget.closest?.('#gcb-agent-cursor')) return;
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

  function isInteractiveStateChange(el, attributeName, _oldValue) {
    if (!(el instanceof Element)) return false;
    const value = attributeName ? el.getAttribute(attributeName) : null;
    if (attributeName === 'aria-selected') return value === 'true';
    if (attributeName === 'aria-expanded') return value === 'true';
    if (attributeName === 'aria-current') return value != null && value !== 'false';
    if (attributeName === 'data-state') return ['active', 'checked', 'open', 'on', 'selected'].includes(value);
    if (attributeName === 'data-selected') return value != null && value !== 'false';
    return false;
  }

  function pointAtStateElement(el) {
    if (!enabled || !(el instanceof Element) || el.closest?.('#gcb-agent-cursor')) return;
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
        // No attributeOldValue / no class watch — class churn on SPAs burns CPU.
        if (isInteractiveStateChange(el, mutation.attributeName, null)) {
          pointAtStateElement(el);
          break;
        }
      }
    });
    interactionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'aria-selected',
        'aria-expanded',
        'aria-current',
        'data-state',
        'data-selected',
      ],
      subtree: true,
    });
  }

  function installFaviconLinks(href) {
    if (!href || !document.head) return;
    document.querySelectorAll(ICON_LINK_SELECTOR).forEach((el) => {
      if (isOurs(el)) return;
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
  }

  async function applyFavicon() {
    if (!enabled) return;
    if (applyingFavicon) {
      applyFaviconQueued = true;
      return;
    }
    applyingFavicon = true;
    try {
      snapshotOriginalIcons();
      const href = await ensureFaviconHref();
      if (!enabled || !href) return;
      installFaviconLinks(href);
    } catch {
    } finally {
      applyingFavicon = false;
      if (applyFaviconQueued && enabled) {
        applyFaviconQueued = false;
        applyFavicon();
      }
    }
  }

  function restoreFavicon() {
    applyingFavicon = true;
    try {
      document.getElementById('gcb-agent-favicon')?.remove();
      document.getElementById('gcb-agent-favicon-shortcut')?.remove();
      if (document.head) {
        for (const snap of originalIconSnapshots) {
          if (!snap.href) continue;
          const link = document.createElement('link');
          link.rel = snap.rel;
          link.href = snap.href;
          if (snap.type) link.type = snap.type;
          if (snap.sizes) link.setAttribute('sizes', snap.sizes);
          document.head.appendChild(link);
        }
      }
    } catch {}
    applyingFavicon = false;
    faviconHref = null;
    faviconBuild = null;
    originalFaviconHref = null;
    originalIconSnapshots = [];
  }

  function startGuards() {
    applyFavicon();
    if (!headObserver && document.head) {
      let debounce = 0;
      headObserver = new MutationObserver(() => {
        if (!enabled || applyingFavicon) return;
        if (debounce) return;
        debounce = setTimeout(() => {
          debounce = 0;
          if (enabled) applyFavicon();
        }, 400);
      });
      headObserver.observe(document.head, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: ['href', 'rel'],
      });
    }
    // No tight setInterval — head observer is enough; idle release stops guards.
    if (faviconTimer) {
      clearInterval(faviconTimer);
      faviconTimer = null;
    }
  }

  function stopGuards() {
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
    if (!on) {
      applyEnabled(false);
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'amIAgentTab' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res?.isAgent) applyEnabled(true);
      });
    } catch {}
  }

  function applyEnabled(on) {
    enabled = !!on;
    if (enabled) {
      startGuards();
      startInteractionObserver();
      attachPageListeners();
      ensureCursor();
      keepCursorVisible();
    } else {
      stopGuards();
      restoreFavicon();
      detachPageListeners();
      interactionObserver?.disconnect();
      interactionObserver = null;
      if (scrollOutTimer) {
        clearTimeout(scrollOutTimer);
        scrollOutTimer = null;
      }
      if (scrollBackTimer) {
        clearTimeout(scrollBackTimer);
        scrollBackTimer = null;
      }
      if (cursorEl) {
        cursorEl.remove();
        cursorEl = null;
        cursorLabelEl = null;
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
      if (msg.enabled === false) {
        applyEnabled(false);
        sendResponse?.({ ok: true });
        return true;
      }
      // Background already gated this to the dedicated agent tab.
      if (msg.trusted) {
        applyEnabled(true);
        if (msg.args?.selector) {
          pointAtSelector(msg.args.selector, { label: msg.command || '' });
        }
        sendResponse?.({ ok: true });
        return true;
      }
      setEnabled(true);
      sendResponse?.({ ok: true });
      return true;
    }
  });
})();
