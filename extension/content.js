/**
 * Forge Design — content script
 * Executes DOM commands inside the real page.
 *
 * Contract: every interactive action moves the visible cursor to the target
 * and waits for it to arrive before any click/type side-effect.
 */
(function () {
if (window.__gcbContentScript) return;
window.__gcbContentScript = true;

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function buildSelector(el) {
  if (!el || el.nodeType !== 1) return null;
  if (el.id) {
    const sel = `#${cssEscape(el.id)}`;
    try {
      if (document.querySelectorAll(sel).length === 1) return sel;
    } catch {}
  }

  for (const attr of ['data-testid', 'data-test', 'aria-label']) {
    const val = el.getAttribute(attr);
    if (!val) continue;
    const sel = `[${attr}="${String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
    try {
      if (document.querySelectorAll(sel).length === 1) return sel;
    } catch {}
  }

  const parts = [];
  let current = el;
  let depth = 0;
  while (current && current.nodeType === 1 && depth < 6) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${cssEscape(current.id)}`);
      break;
    }
    if (current.classList && current.classList.length) {
      const cls = [...current.classList]
        .filter((c) => c && !c.startsWith('css-') && c.length < 40)
        .slice(0, 2);
      if (cls.length) part += cls.map((c) => `.${cssEscape(c)}`).join('');
    }
    const parent = current.parentElement;
    if (parent) {
      const same = [...parent.children].filter((c) => c.tagName === current.tagName);
      if (same.length > 1) {
        part += `:nth-of-type(${same.indexOf(current) + 1})`;
      }
    }
    parts.unshift(part);
    current = current.parentElement;
    depth++;
  }
  return parts.join(' > ');
}

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function queryOne(selector) {
  if (!selector) return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(selector, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = queryOne(selector);
    if (el && isVisible(el)) return el;
    await sleep(200);
  }
  throw new Error(`wait timeout: ${selector}`);
}

function shortText(el, max = 160) {
  if (!el) return '';
  return (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

function describeElement(el) {
  if (!el || el.nodeType !== 1) return null;
  const rect = el.getBoundingClientRect();
  const selector = buildSelector(el);
  let unique = false;
  try {
    unique = !!(selector && document.querySelectorAll(selector).length === 1);
  } catch {}

  const attrs = {};
  for (const name of ['data-testid', 'data-test', 'name', 'type', 'role', 'href', 'placeholder']) {
    const val = el.getAttribute(name);
    if (val) attrs[name] = val;
  }

  const ancestors = [];
  let current = el.parentElement;
  while (current && current !== document.documentElement && ancestors.length < 4) {
    ancestors.push({
      tag: current.tagName.toLowerCase(),
      id: current.id || null,
      testid: current.getAttribute('data-testid') || null,
      text: shortText(current, 60) || null,
    });
    current = current.parentElement;
  }

  return {
    pickedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    selector,
    unique,
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    classes: el.classList ? [...el.classList].slice(0, 8) : [],
    role: el.getAttribute('role') || null,
    type: el.getAttribute('type') || null,
    name: el.getAttribute('name') || null,
    testid: el.getAttribute('data-testid') || null,
    ariaLabel: el.getAttribute('aria-label') || null,
    placeholder: el.getAttribute('placeholder') || null,
    href: el.href || el.getAttribute('href') || null,
    text: shortText(el),
    attrs,
    ancestors,
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
  };
}

let pickerSession = null;

function pickerIgnore(el) {
  return !!(el && el.closest && el.closest('[data-gcb-picker]'));
}

function stopPicker(result) {
  const session = pickerSession;
  if (!session) return;
  pickerSession = null;
  document.removeEventListener('mousemove', session.onMove, true);
  document.removeEventListener('click', session.onClick, true);
  document.removeEventListener('keydown', session.onKey, true);
  window.removeEventListener('keydown', session.onKey, true);
  document.removeEventListener('contextmenu', session.onCancel, true);
  document.removeEventListener('scroll', session.onScroll, true);
  session.root.remove();
  document.documentElement.style.cursor = session.prevCursor;
  session.resolve(result);
}

function startPicker() {
  if (pickerSession) return pickerSession.promise;

  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });

  const root = document.createElement('div');
  root.setAttribute('data-gcb-picker', '1');
  root.id = 'gcb-picker-root';
  root.innerHTML =
    '<div id="gcb-picker-box" data-gcb-picker="1"></div>' +
    '<div id="gcb-picker-label" data-gcb-picker="1"></div>' +
    '<div id="gcb-picker-hint" data-gcb-picker="1">点击页面元素，Grok 就能对准它 · Esc 取消</div>';
  document.documentElement.appendChild(root);

  const box = root.querySelector('#gcb-picker-box');
  const label = root.querySelector('#gcb-picker-label');
  let hovered = null;

  function paint(el) {
    if (!el || el === document.documentElement || el === document.body) {
      box.style.display = 'none';
      label.style.display = 'none';
      return;
    }
    const rect = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = `${Math.round(rect.left)}px`;
    box.style.top = `${Math.round(rect.top)}px`;
    box.style.width = `${Math.max(1, Math.round(rect.width))}px`;
    box.style.height = `${Math.max(1, Math.round(rect.height))}px`;
    const name = [
      el.tagName.toLowerCase(),
      el.id ? `#${el.id}` : '',
      el.getAttribute('data-testid') ? `[testid=${el.getAttribute('data-testid')}]` : '',
    ].join('');
    label.textContent = `${name}  ${shortText(el, 48)}`.trim();
    label.style.display = 'block';
    const labelTop = rect.top >= 28 ? rect.top - 24 : rect.bottom + 6;
    label.style.left = `${Math.max(8, Math.round(rect.left))}px`;
    label.style.top = `${Math.round(labelTop)}px`;
  }

  function targetFromEvent(event) {
    let el = event.target;
    if (el && el.nodeType !== 1) el = el.parentElement;
    if (pickerIgnore(el)) return hovered;
    return el;
  }

  const onMove = (event) => {
    hovered = targetFromEvent(event);
    paint(hovered);
  };
  const onScroll = () => paint(hovered);
  const onClick = (event) => {
    if (pickerIgnore(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    const el = targetFromEvent(event);
    const pick = describeElement(el);
    if (pick) {
      try {
        chrome.runtime.sendMessage({ type: 'picker-result', pick });
      } catch {}
      stopPicker({ ok: true, pick });
    } else {
      stopPicker({ cancelled: true, error: 'no element' });
    }
  };
  const onKey = (event) => {
    if (event.key === 'Escape' || event.code === 'Escape' || event.keyCode === 27) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      stopPicker({ cancelled: true });
    }
  };
  const onCancel = (event) => {
    event.preventDefault();
    stopPicker({ cancelled: true });
  };

  const prevCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = 'crosshair';
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('contextmenu', onCancel, true);
  document.addEventListener('scroll', onScroll, true);

  pickerSession = { promise, resolve, root, onMove, onClick, onKey, onCancel, onScroll, prevCursor };
  return promise;
}

function collectInteractive(limit = 80) {
  const selectors = [
    'a[href]',
    'button',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="textbox"]',
    '[contenteditable="true"]',
    '[data-testid]',
  ];
  const seen = new Set();
  const items = [];

  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      if (!isVisible(el)) continue;
      const key = el;
      if (seen.has(key)) continue;
      seen.add(key);

      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 120);

      items.push({
        ref: items.length + 1,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || null,
        type: el.getAttribute('type') || null,
        name: el.getAttribute('name') || null,
        id: el.id || null,
        testid: el.getAttribute('data-testid') || null,
        text,
        href: el.href || null,
        selector: buildSelector(el),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        },
      });
      if (items.length >= limit) return items;
    }
  }
  return items;
}

function setNativeValue(el, value) {
  const proto =
    el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function typeText(el, text, opts = {}) {
  el.focus();
  await sleep(50);

  // contenteditable / role=textbox (X compose uses this)
  if (el.isContentEditable || el.getAttribute('role') === 'textbox') {
    // Clear existing
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
    } catch {}
    await sleep(30);

    // 1) Clipboard paste — works best with React/Draft-style editors (X)
    let pasted = false;
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      pasted = !el.dispatchEvent(pasteEvent) || (el.innerText || '').includes(text.slice(0, 12));
    } catch {}

    // 2) insertText fallback
    if (!pasted || !(el.innerText || '').trim()) {
      try {
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
      } catch {
        el.textContent = text;
      }
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' })
      );
    }

    // 3) beforeinput + input simulation if still empty
    if (!(el.innerText || '').trim()) {
      el.dispatchEvent(
        new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text,
        })
      );
      el.textContent = text;
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' })
      );
    }
    return;
  }

  if ('value' in el) {
    if (opts.clear !== false) setNativeValue(el, '');
    if (opts.slow) {
      let cur = el.value || '';
      for (const ch of text) {
        cur += ch;
        setNativeValue(el, cur);
        await sleep(20 + Math.random() * 40);
      }
    } else {
      setNativeValue(el, (opts.clear === false ? el.value : '') + text);
    }
    return;
  }

  // fallback
  el.textContent = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Cursor CSS transition is 420ms — never act before the pointer arrives. */
const CURSOR_ARRIVE_MS = 500;

function agentNotify() {
  try {
    window.__gcbAgent?.enable();
  } catch {}
}

/**
 * Pick a stable visual center. Prefer the largest client rect (x.com often
 * gives multi-line / fragmented boxes on buttons and links).
 */
function elementCenter(el) {
  if (!(el instanceof Element)) return null;
  let best = null;
  let bestArea = 0;
  try {
    const rects = el.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = r;
      }
    }
  } catch {}
  if (!best) {
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    best = rect;
    bestArea = rect.width * rect.height;
  }
  if (!best || (best.width <= 0 && best.height <= 0)) return null;
  return {
    x: best.left + best.width / 2,
    y: best.top + best.height / 2,
    rect: best,
  };
}

/**
 * Fallback cursor when agent-ui.js is missing (should be rare). Ensures the
 * move-before-click contract never silently degrades into an invisible click.
 */
function ensureFallbackCursor() {
  let el = document.getElementById('gcb-agent-cursor');
  if (el && document.documentElement.contains(el)) return el;
  el = document.createElement('div');
  el.id = 'gcb-agent-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<span class="gcb-agent-cursor-arrow"><svg viewBox="0 0 24 32" width="23" height="30" aria-hidden="true"><path d="M2.25 1.75v24.1l6.05-5.12 4.15 9.02 4.05-1.88-4.1-8.9h8.05L2.25 1.75Z" fill="#080808" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg></span><span class="gcb-agent-cursor-ring"></span>';
  const s = el.style;
  s.setProperty('position', 'fixed', 'important');
  s.setProperty('top', '0', 'important');
  s.setProperty('left', '0', 'important');
  s.setProperty('z-index', '2147483647', 'important');
  s.setProperty('pointer-events', 'none', 'important');
  s.setProperty('opacity', '1', 'important');
  s.setProperty('transition', 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
  s.transform = `translate3d(${Math.round(window.innerWidth / 2)}px, ${Math.round(window.innerHeight / 2)}px, 0)`;
  (document.documentElement || document.body).appendChild(el);
  return el;
}

/**
 * Move the visible agent cursor onto `el` and wait until the animation lands.
 * Every page action must call this before interacting with the target.
 * Returns the landing coordinates, or null if the element has no box.
 */
async function pointAtElement(el, label = '', click = false) {
  if (!el) return null;
  try {
    agentNotify();
    // Wait a frame after scroll so x.com layout / virtualized lists settle.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const center = elementCenter(el);
    if (!center) return null;

    const agent = window.__gcbAgent;
    if (agent?.moveCursorAsync) {
      await agent.moveCursorAsync(center.x, center.y, { label: label || '' });
    } else if (agent?.moveCursor) {
      agent.moveCursor(center.x, center.y, { label: label || '' });
      await sleep(CURSOR_ARRIVE_MS);
    } else {
      const cursor = ensureFallbackCursor();
      cursor.style.transform = `translate3d(${center.x}px, ${center.y}px, 0)`;
      cursor.style.setProperty('opacity', '1', 'important');
      await sleep(CURSOR_ARRIVE_MS);
    }
    if (click) {
      try {
        window.__gcbAgent?.showClick?.();
      } catch {}
    }
    return center;
  } catch (err) {
    console.warn('[gcb] pointAtElement failed', err);
    return null;
  }
}

function resolveActionTarget(el) {
  if (!(el instanceof Element)) return el;
  return (
    el.closest(
      'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [role="radio"], [contenteditable="true"], [data-testid]'
    ) || el
  );
}

function mouseEventInit(x, y, extra = {}) {
  return {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    button: 0,
    buttons: extra.buttons ?? 0,
    detail: extra.detail ?? 0,
    ...extra,
  };
}

/**
 * Full pointer/mouse sequence at element center (after cursor has arrived).
 * Mirrors a real user: hover → move → down → up → click.
 */
function dispatchPointerClick(el, x, y) {
  const target = el;
  const common = { pointerId: 1, pointerType: 'mouse', isPrimary: true };

  // Mark bridge-driven clicks so agent-ui can skip its reactive move/click
  // feedback (cursor already arrived before this sequence runs).
  window.__gcbBridgeClicking = true;
  try {
    target.dispatchEvent(
      new PointerEvent('pointerover', mouseEventInit(x, y, { ...common, buttons: 0 }))
    );
    target.dispatchEvent(new MouseEvent('mouseover', mouseEventInit(x, y, { buttons: 0 })));
    target.dispatchEvent(
      new PointerEvent('pointerenter', mouseEventInit(x, y, { ...common, bubbles: false, buttons: 0 }))
    );
    target.dispatchEvent(
      new MouseEvent('mouseenter', mouseEventInit(x, y, { bubbles: false, buttons: 0 }))
    );
    target.dispatchEvent(
      new PointerEvent('pointermove', mouseEventInit(x, y, { ...common, buttons: 0 }))
    );
    target.dispatchEvent(new MouseEvent('mousemove', mouseEventInit(x, y, { buttons: 0 })));
    target.dispatchEvent(
      new PointerEvent('pointerdown', mouseEventInit(x, y, { ...common, buttons: 1, detail: 1 }))
    );
    target.dispatchEvent(new MouseEvent('mousedown', mouseEventInit(x, y, { buttons: 1, detail: 1 })));
    try {
      target.focus?.({ preventScroll: true });
    } catch {
      target.focus?.();
    }
    target.dispatchEvent(
      new PointerEvent('pointerup', mouseEventInit(x, y, { ...common, buttons: 0, detail: 1 }))
    );
    target.dispatchEvent(new MouseEvent('mouseup', mouseEventInit(x, y, { buttons: 0, detail: 1 })));
    target.dispatchEvent(new MouseEvent('click', mouseEventInit(x, y, { buttons: 0, detail: 1 })));
  } finally {
    // Defer clear so capture-phase listeners still see the flag.
    setTimeout(() => {
      window.__gcbBridgeClicking = false;
    }, 0);
  }
}

/**
 * Prefer a visibly hit-testable descendant when the matched node is a large
 * wrapper (common on x.com articles / toolbars).
 */
function preferClickableTarget(el) {
  if (!(el instanceof Element)) return el;
  const resolved = resolveActionTarget(el);
  const rect = resolved.getBoundingClientRect();
  // Huge wrappers (full tweet cards) — aim at a compact interactive child first.
  if (rect.width * rect.height > 120000) {
    const child = resolved.querySelector(
      'button, a[href], [role="button"], [data-testid="like"], [data-testid="reply"], [data-testid="retweet"], [data-testid="bookmark"], [data-testid="app-bar-close"], [data-testid="tweetButtonInline"], [data-testid="tweetButton"]'
    );
    if (child && isVisible(child)) return child;
  }
  return resolved;
}

/**
 * Universal click contract for every page:
 * scroll into view → move cursor → wait for arrival → click feedback → real events.
 */
async function humanClick(el) {
  if (!(el instanceof Element)) throw new Error('humanClick: not an element');
  const target = preferClickableTarget(el);
  target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
  await sleep(80);
  // Re-measure after scroll; always move cursor before any click side-effect.
  let center = await pointAtElement(target, '', true);
  if (!center) {
    // Element may have no box — still move toward its bounding rect before click.
    const rect = target.getBoundingClientRect();
    center = {
      x: rect.left + Math.max(rect.width, 1) / 2,
      y: rect.top + Math.max(rect.height, 1) / 2,
    };
    const agent = window.__gcbAgent;
    if (agent?.moveCursorAsync) {
      await agent.moveCursorAsync(center.x, center.y, { label: '' });
    } else if (agent?.moveCursor) {
      agent.moveCursor(center.x, center.y, { label: '' });
      await sleep(CURSOR_ARRIVE_MS);
    } else {
      const cursor = ensureFallbackCursor();
      cursor.style.transform = `translate3d(${center.x}px, ${center.y}px, 0)`;
      await sleep(CURSOR_ARRIVE_MS);
    }
    try {
      window.__gcbAgent?.showClick?.();
    } catch {}
  }
  dispatchPointerClick(target, center.x, center.y);
  return center;
}

async function handleDomCommand(command, args) {
  agentNotify();
  switch (command) {
    case 'text': {
      const max = args.maxChars || 12000;
      const text = (document.body && document.body.innerText) || '';
      return {
        url: location.href,
        title: document.title,
        text: text.slice(0, max),
        truncated: text.length > max,
      };
    }

    case 'snapshot': {
      const max = args.maxChars || 8000;
      const text = ((document.body && document.body.innerText) || '').slice(0, max);
      return {
        url: location.href,
        title: document.title,
        text,
        interactive: collectInteractive(args.limit || 80),
      };
    }

    case 'exists': {
      const el = queryOne(args.selector);
      return { exists: !!(el && isVisible(el)), selector: args.selector };
    }

    case 'wait': {
      if (args.selector) {
        const el = await waitFor(args.selector, args.timeoutMs || 10000);
        return { ok: true, selector: args.selector, found: true, tag: el.tagName.toLowerCase() };
      }
      await sleep(args.ms || 500);
      return { ok: true };
    }

    case 'click': {
      const selected = args.selector ? queryOne(args.selector) : null;
      if (!selected) return { error: `Element not found: ${args.selector}` };
      // Always move cursor to the target and wait for arrival before clicking.
      await humanClick(selected);
      return {
        ok: true,
        selector: args.selector,
        tag: selected.tagName.toLowerCase(),
      };
    }

    case 'focus': {
      const el = queryOne(args.selector);
      if (!el) return { error: `Element not found: ${args.selector}` };
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
      await sleep(50);
      await pointAtElement(el, '聚焦');
      el.focus();
      return { ok: true };
    }

    case 'fill': {
      const el = queryOne(args.selector);
      if (!el) return { error: `Element not found: ${args.selector}` };
      // Move cursor first, then click into the field so focus matches real input.
      await humanClick(el);
      window.__gcbAgent?.showActivity?.();
      await typeText(el, args.text ?? '', { clear: true, slow: !!args.slow });
      return { ok: true, selector: args.selector };
    }

    case 'type': {
      let el = args.selector ? queryOne(args.selector) : document.activeElement;
      if (!el) return { error: 'No element to type into' };
      if (args.selector) {
        await humanClick(el);
      } else {
        await pointAtElement(el, '输入');
      }
      window.__gcbAgent?.showActivity?.();
      await typeText(el, args.text ?? '', { clear: !!args.clear, slow: args.slow !== false });
      return { ok: true };
    }

    case 'press': {
      const key = args.key || 'Enter';
      const el = args.selector ? queryOne(args.selector) : document.activeElement || document.body;
      if (args.selector && el) {
        el.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'auto' });
        await sleep(50);
      }
      await pointAtElement(el, `按键 ${key}`);
      const opts = {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        bubbles: true,
        cancelable: true,
      };
      el.dispatchEvent(new KeyboardEvent('keydown', opts));
      el.dispatchEvent(new KeyboardEvent('keypress', opts));
      el.dispatchEvent(new KeyboardEvent('keyup', opts));
      if (key === 'Enter' && el.tagName === 'INPUT' && el.form) {
        el.form.requestSubmit?.();
      }
      return { ok: true, key };
    }

    case 'select': {
      const el = queryOne(args.selector);
      if (!el) return { error: `Element not found: ${args.selector}` };
      await humanClick(el);
      el.value = args.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }

    case 'getValue': {
      const el = queryOne(args.selector);
      if (!el) return { error: `Element not found: ${args.selector}` };
      const value =
        el.value != null
          ? el.value
          : el.isContentEditable
            ? el.innerText
            : el.textContent;
      return { value };
    }

    case 'scroll': {
      if (args.selector) {
        const el = queryOne(args.selector);
        if (!el) return { error: `Element not found: ${args.selector}` };
        el.scrollIntoView({ block: args.block || 'center' });
        await sleep(50);
        await pointAtElement(el, '滚动至');
      } else {
        const deltaY = args.y ?? 600;
        window.__gcbAgent?.showScroll?.(deltaY < 0 ? -1 : 1);
        await sleep(120);
        window.scrollBy(0, deltaY);
      }
      return { ok: true };
    }

    case 'eval': {
      // Restricted: only allow simple expressions via Function, no imports
      if (!args.expression || typeof args.expression !== 'string') {
        return { error: 'expression required' };
      }
      if (args.expression.length > 2000) return { error: 'expression too long' };
      // Soft block obvious abuse
      if (/\b(fetch|XMLHttpRequest|WebSocket|eval|Function|import)\b/.test(args.expression)) {
        return { error: 'expression blocked for safety' };
      }
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(`return (${args.expression})`);
        const value = fn();
        return { value: value == null ? null : JSON.parse(JSON.stringify(value)) };
      } catch (err) {
        return { error: err.message };
      }
    }

    default:
      return { error: `Unknown DOM command: ${command}` };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ping') {
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'agent-ui-enable') {
    try {
      window.__gcbAgent?.enable();
    } catch {}
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'picker-start') {
    startPicker()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true;
  }

  if (msg.type === 'picker-cancel') {
    stopPicker({ cancelled: true });
    sendResponse({ cancelled: true });
    return true;
  }

  if (msg.type === 'dom') {
    handleDomCommand(msg.command, msg.args || {})
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true;
  }
});
})();
