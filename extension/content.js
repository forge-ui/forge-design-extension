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

/** Double-rAF with timeout — background agent tabs often never fire rAF. */
function nextFrames(count = 2, timeoutMs = 48) {
  return new Promise((resolve) => {
    let left = Math.max(1, count);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const tick = () => {
      left -= 1;
      if (left <= 0) finish();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, timeoutMs);
  });
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

function compactHtml(el, max = 480) {
  if (!el || el.nodeType !== 1) return '';
  try {
    let html = el.outerHTML || '';
    html = html.replace(/\s+/g, ' ').trim();
    if (html.length > max) html = `${html.slice(0, max)}…`;
    return html;
  } catch {
    return '';
  }
}

function pickStyles(el) {
  try {
    const cs = getComputedStyle(el);
    return {
      display: cs.display || '',
      position: cs.position || '',
      color: cs.color || '',
      backgroundColor: cs.backgroundColor || '',
      fontSize: cs.fontSize || '',
      fontWeight: cs.fontWeight || '',
      lineHeight: cs.lineHeight || '',
      borderRadius: cs.borderRadius || '',
      padding: cs.padding || '',
      margin: cs.margin || '',
      width: cs.width || '',
      height: cs.height || '',
    };
  } catch {
    return null;
  }
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
  while (current && current !== document.documentElement && ancestors.length < 5) {
    ancestors.push({
      tag: current.tagName.toLowerCase(),
      id: current.id || null,
      testid: current.getAttribute('data-testid') || null,
      role: current.getAttribute('role') || null,
      text: shortText(current, 60) || null,
    });
    current = current.parentElement;
  }

  const sibling = el.parentElement
    ? [...el.parentElement.children]
        .filter((node) => node !== el && node.nodeType === 1)
        .slice(0, 4)
        .map((node) => ({
          tag: node.tagName.toLowerCase(),
          text: shortText(node, 40) || null,
          testid: node.getAttribute('data-testid') || null,
        }))
    : [];

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
    siblings: sibling,
    html: compactHtml(el),
    styles: pickStyles(el),
    dpr: window.devicePixelRatio || 1,
    viewport: {
      w: window.innerWidth || 0,
      h: window.innerHeight || 0,
    },
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
  };
}

let overlaySession = null;
let placeGhosts = [];
let placeGhostListeners = null;
let placeGhostDim = null;

function overlayIgnore(el, event) {
  const nodes = [];
  if (event && typeof event.composedPath === 'function') {
    for (const node of event.composedPath()) nodes.push(node);
  } else if (el) {
    nodes.push(el);
  }
  for (const node of nodes) {
    if (!node) continue;
    if (node.nodeType === 1 && node.closest && node.closest('[data-gcb-picker]')) return true;
    if (node.host && node.host.closest && node.host.closest('[data-gcb-picker]')) return true;
  }
  return false;
}

function stopOverlay(result) {
  const session = overlaySession;
  if (!session) return;
  overlaySession = null;
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

function attachOverlay({ root, onMove, onClick, onScroll, resolve, cursor }) {
  const onKey = (event) => {
    if (event.key === 'Escape' || event.code === 'Escape' || event.keyCode === 27) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      stopOverlay({ cancelled: true });
    }
  };
  const onCancel = (event) => {
    event.preventDefault();
    stopOverlay({ cancelled: true });
  };
  const prevCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = cursor || 'crosshair';
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('contextmenu', onCancel, true);
  document.addEventListener('scroll', onScroll, true);
  overlaySession = { promise: null, resolve, root, onMove, onClick, onKey, onCancel, onScroll, prevCursor };
}

function createOverlayRoot(html) {
  const root = document.createElement('div');
  root.setAttribute('data-gcb-picker', '1');
  root.id = 'gcb-picker-root';
  root.innerHTML = html;
  document.documentElement.appendChild(root);
  return root;
}

function startPicker() {
  if (overlaySession) stopOverlay({ cancelled: true });

  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });

  const root = createOverlayRoot(
    '<div id="gcb-picker-box" data-gcb-picker="1"></div>' +
    '<div id="gcb-picker-label" data-gcb-picker="1"></div>' +
    '<div id="gcb-picker-hint" data-gcb-picker="1">点击页面元素，Grok 就能对准它 · Esc 取消</div>'
  );

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
    if (overlayIgnore(el, event)) return hovered;
    return el;
  }

  const onMove = (event) => {
    hovered = targetFromEvent(event);
    paint(hovered);
  };
  const onScroll = () => paint(hovered);
  const onClick = (event) => {
    if (overlayIgnore(event.target, event)) return;
    event.preventDefault();
    event.stopPropagation();
    const el = targetFromEvent(event);
    const pick = describeElement(el);
    if (pick) {
      try {
        chrome.runtime.sendMessage({ type: 'picker-result', pick });
      } catch {}
      stopOverlay({ ok: true, pick });
    } else {
      stopOverlay({ cancelled: true, error: 'no element' });
    }
  };

  attachOverlay({ root, onMove, onClick, onScroll, resolve });
  overlaySession.promise = promise;
  return promise;
}

function placeBlockTarget(el) {
  let current = el;
  let depth = 0;
  while (current && current.parentElement && current !== document.body && depth < 8) {
    const inline = ['SPAN', 'A', 'STRONG', 'EM', 'SVG', 'PATH', 'LABEL', 'I', 'SMALL', 'CODE'].includes(current.tagName);
    const rect = current.getBoundingClientRect();
    if (!inline && rect.height >= 28 && rect.width >= 64) return current;
    current = current.parentElement;
    depth += 1;
  }
  return el;
}

function insertPositionFor(el, event) {
  const rect = el.getBoundingClientRect();
  return closestEdge(rect, event.clientX, event.clientY).position;
}

function closestEdge(rect, x, y) {
  const dist = {
    before: Math.abs(y - rect.top),
    after: Math.abs(y - rect.bottom),
    left: Math.abs(x - rect.left),
    right: Math.abs(x - rect.right),
  };
  const position = Object.keys(dist).reduce((best, key) => (dist[key] < dist[best] ? key : best), 'after');
  const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
  const approach = inside ? dist[position] : Math.hypot(dx, dy);
  const inset = inside ? Math.min(x - rect.left, rect.right - x, y - rect.top, rect.bottom - y) : 0;
  return { position, dist: dist[position], approach, inside, inset, rect };
}

function insidePadFor(item) {
  const kind = item.place?.component?.kind || item.component?.kind || '';
  if (kind === 'button' || kind === 'iconbtn' || kind === 'chip' || kind === 'link' || kind === 'toggle') return 999;
  if (kind === 'table' || kind === 'card' || kind === 'list' || kind === 'layout') return 18;
  return 28;
}

function hitGhostInterior(item, x, y) {
  const host = item.ghost.getBoundingClientRect();
  let best = null;
  try {
    const nodes = item.shadow.querySelectorAll(
      'td, th, [role="cell"], [role="columnheader"], [role="gridcell"]'
    );
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
      const area = box.width * box.height;
      if (!best || area < best.area) best = { node, rect: box, area };
    }
  } catch {}
  if (!best) return { rect: host, slot: null };
  const cell = best.node;
  const rowEl = cell.closest('tr, [role="row"]');
  const table = cell.closest('table, [role="table"], [role="grid"]');
  const col = Number.isInteger(cell.cellIndex)
    ? cell.cellIndex
    : rowEl
      ? [...rowEl.children].indexOf(cell)
      : -1;
  const rows = table ? [...table.querySelectorAll('tr, [role="row"]')] : [];
  const row = rowEl && table ? rows.indexOf(rowEl) : -1;
  return {
    rect: best.rect,
    slot: {
      tag: cell.tagName.toLowerCase(),
      text: (cell.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      row,
      col,
      header: cell.tagName === 'TH' || cell.getAttribute('role') === 'columnheader',
    },
  };
}

function ghostTargetAt(item, x, y) {
  const rect = item.ghost.getBoundingClientRect();
  const edge = closestEdge(rect, x, y);
  const area = Math.max(1, rect.width * rect.height);
  if (!edge.inside) {
    if (edge.approach > 56) return null;
    return { item, ...edge, slot: null, area };
  }
  if (edge.inset > insidePadFor(item)) {
    const interior = hitGhostInterior(item, x, y);
    const box = interior.rect || rect;
    return {
      item,
      position: 'inside',
      dist: 0,
      approach: 0,
      inside: true,
      inset: edge.inset,
      rect: box,
      slot: interior.slot || null,
      area: Math.max(1, box.width * box.height),
    };
  }
  return { item, ...edge, slot: null, area };
}

function nearestGhostTarget(x, y) {
  let best = null;
  for (const item of placeGhosts) {
    if (item.ghost.getAttribute('data-gcb-committed') === '1') continue;
    const hit = ghostTargetAt(item, x, y);
    if (!hit) continue;
    if (!best) {
      best = hit;
      continue;
    }
    if (hit.inside && (!best.inside || hit.area < best.area)) {
      best = hit;
      continue;
    }
    if (!hit.inside && !best.inside && hit.approach < best.approach) best = hit;
  }
  return best;
}

const PLACE_GHOST_CSS = `
:host { display: block; }
* { box-sizing: border-box; }
.wrap {
  position: relative;
  width: 100%;
  overflow: visible;
  background: transparent;
}
.wrap.bare { overflow: visible; }
.num {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #000a19;
  color: #fff;
  font: 700 11px/20px Manrope, ui-sans-serif, system-ui, sans-serif;
  text-align: center;
  box-shadow: 0 0 0 2px #fff;
  pointer-events: none;
}
.close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #000a19;
  color: #fff;
  box-shadow: 0 0 0 2px #fff;
  cursor: pointer;
  pointer-events: auto;
}
.close:hover { background: #1a2238; }
.close svg { display: block; }
.wrap.bare .num { top: -8px; left: -8px; }
.wrap.bare .close { top: -8px; right: -8px; }
.stage { width: 100%; min-height: 24px; pointer-events: none; }
`;

function ghostSizeFor(kind) {
  if (kind === 'header' || kind === 'layout') return { height: 108, minWidth: 280 };
  if (kind === 'card' || kind === 'list' || kind === 'menu') return { height: 168, minWidth: 280 };
  if (kind === 'filter' || kind === 'tabs' || kind === 'field' || kind === 'select') return { height: 86, minWidth: 280 };
  if (kind === 'table') return { height: 268, minWidth: 320 };
  if (kind === 'cell') return { height: 44, minWidth: 120 };
  if (kind === 'stat' || kind === 'stat-bar' || kind === 'stat-wheel' || kind === 'stat-plain') return { height: 176, minWidth: 280 };
  if (kind === 'chart' || kind === 'cal') return { height: 236, minWidth: 320 };
  if (kind === 'button' || kind === 'iconbtn' || kind === 'link' || kind === 'chip' || kind === 'toggle' || kind === 'pager' || kind === 'crumbs') return { height: 86, minWidth: 220 };
  if (kind === 'dialog') return { height: 248, minWidth: 360 };
  if (kind === 'nav' || kind === 'steps') return { height: 140, minWidth: 220 };
  if (kind === 'chat' || kind === 'area' || kind === 'upload' || kind === 'check') return { height: 140, minWidth: 260 };
  if (kind === 'avatar' || kind === 'bar') return { height: 100, minWidth: 220 };
  return { height: 160, minWidth: 280 };
}

function restorePlaceGap(el) {
  if (!el) return;
  const raw = el.getAttribute('data-gcb-place-gap');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    el.style.marginTop = saved.marginTop || '';
    el.style.marginBottom = saved.marginBottom || '';
    el.style.marginLeft = saved.marginLeft || '';
    el.style.marginRight = saved.marginRight || '';
    el.style.paddingTop = saved.paddingTop || '';
    el.style.paddingBottom = saved.paddingBottom || '';
    el.style.paddingLeft = saved.paddingLeft || '';
    el.style.paddingRight = saved.paddingRight || '';
  } catch {}
  el.removeAttribute('data-gcb-place-gap');
}

function clearPlaceGap() {
  document.querySelectorAll('[data-gcb-place-gap]').forEach((node) => restorePlaceGap(node));
}

function applyCombinedGap(el, gaps) {
  restorePlaceGap(el);
  const before = gaps?.before || 0;
  const after = gaps?.after || 0;
  const left = gaps?.left || 0;
  const right = gaps?.right || 0;
  if (!el || !el.style || (before <= 0 && after <= 0 && left <= 0 && right <= 0)) return;
  const style = window.getComputedStyle(el);
  el.setAttribute('data-gcb-place-gap', JSON.stringify({
    marginTop: el.style.marginTop,
    marginBottom: el.style.marginBottom,
    marginLeft: el.style.marginLeft,
    marginRight: el.style.marginRight,
    paddingTop: el.style.paddingTop,
    paddingBottom: el.style.paddingBottom,
    paddingLeft: el.style.paddingLeft,
    paddingRight: el.style.paddingRight,
  }));
  if (before > 0) {
    if ((parseFloat(style.paddingTop) || 0) < 1) el.style.paddingTop = '1px';
    el.style.marginTop = `${(parseFloat(style.marginTop) || 0) + before}px`;
  }
  if (after > 0) {
    if ((parseFloat(style.paddingBottom) || 0) < 1) el.style.paddingBottom = '1px';
    el.style.marginBottom = `${(parseFloat(style.marginBottom) || 0) + after}px`;
  }
  if (left > 0) {
    if ((parseFloat(style.paddingLeft) || 0) < 1) el.style.paddingLeft = '1px';
    el.style.marginLeft = `${(parseFloat(style.marginLeft) || 0) + left}px`;
  }
  if (right > 0) {
    if ((parseFloat(style.paddingRight) || 0) < 1) el.style.paddingRight = '1px';
    el.style.marginRight = `${(parseFloat(style.marginRight) || 0) + right}px`;
  }
}

function slotLabel(position) {
  if (position === 'before') return '上方';
  if (position === 'left') return '左侧';
  if (position === 'right') return '右侧';
  if (position === 'inside') return '内部';
  return '下方';
}

function ghostByPlacedAt(id) {
  return placeGhosts.find((item) => item.place.placedAt === id) || null;
}

function isPlaceRoot(item) {
  if (!item?.place.relativeTo) return true;
  const seen = new Set();
  let cur = item;
  while (cur?.place.relativeTo) {
    if (seen.has(cur.place.placedAt)) return true;
    seen.add(cur.place.placedAt);
    const parent = ghostByPlacedAt(cur.place.relativeTo);
    if (!parent) return true;
    cur = parent;
  }
  return false;
}

function captureGhostRect(item) {
  const box = item.ghost?.getBoundingClientRect?.();
  if (!box) return null;
  return {
    x: Math.round(box.left),
    y: Math.round(box.top),
    w: Math.round(box.width),
    h: Math.round(box.height),
  };
}

function placeListPayload() {
  return placeGhosts.map((item, index) => {
    const parent = item.place.relativeTo ? ghostByPlacedAt(item.place.relativeTo) : null;
    const parentIndex = parent ? placeGhosts.indexOf(parent) + 1 : null;
    return {
      ...item.place,
      index: index + 1,
      relativeTo: item.place.relativeTo || null,
      relativeToIndex: parentIndex,
      slot: item.place.slot || null,
      inset: item.place.inset || null,
      rect: captureGhostRect(item),
    };
  });
}

function layoutComposition(places) {
  const list = places || placeListPayload();
  const lines = list.map((item) => {
    const name = item.component?.name || item.component?.exportName || 'Forge';
    if (item.relativeToIndex && item.position === 'inside') {
      const cell = item.slot?.text ? `「${item.slot.text}」` : item.slot?.col >= 0 ? `第 ${item.slot.row + 1} 行第 ${item.slot.col + 1} 列` : '';
      return `#${item.index} ${name} 叠在 #${item.relativeToIndex} 内部${cell ? ` ${cell}` : ''}`;
    }
    if (item.relativeToIndex) {
      return `#${item.index} ${name} 在 #${item.relativeToIndex} 的${slotLabel(item.position)}`;
    }
    const anchor = item.pick?.testid || item.pick?.text || item.pick?.selector || '页面锚点';
    return `#${item.index} ${name} 在「${anchor}」的${slotLabel(item.position)}`;
  });
  const rows = list.filter((item) => item.relativeToIndex && (item.position === 'left' || item.position === 'right'));
  if (rows.length) {
    lines.push('同一行：left/right 相对另一块预览的组件，源码里用 flex 行排列，不要拆成上下两块。');
  }
  return lines.join('\n');
}

function broadcastPlaces() {
  try {
    const places = placeListPayload();
    chrome.runtime.sendMessage({
      type: places.length || overlaySession ? 'place-preview' : 'place-dismiss',
      place: places[places.length - 1] || null,
      places,
      layout: layoutComposition(places),
    });
  } catch {}
}

function ensurePlaceGhostListeners() {
  if (placeGhostListeners) return;
  const onScroll = () => layoutAllPlaceGhosts();
  const onResize = () => layoutAllPlaceGhosts();
  const onKey = (event) => {
    if (overlaySession) return;
    if (event.key !== 'Escape' && event.code !== 'Escape') return;
    event.preventDefault();
    undoLastPlaceGhost();
  };
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize, true);
  document.addEventListener('keydown', onKey, true);
  placeGhostListeners = { onScroll, onResize, onKey };
}

function teardownPlaceGhostListeners() {
  if (!placeGhostListeners) return;
  window.removeEventListener('scroll', placeGhostListeners.onScroll, true);
  window.removeEventListener('resize', placeGhostListeners.onResize, true);
  document.removeEventListener('keydown', placeGhostListeners.onKey, true);
  placeGhostListeners = null;
}

function childGroups(item) {
  const groups = { before: [], after: [], left: [], right: [], inside: [] };
  const id = item.place.placedAt;
  for (const child of placeGhosts) {
    if (child.place.relativeTo === id) groups[ghostSlot(child.position)].push(child);
  }
  return groups;
}

function makeClusterSize() {
  const memo = new Map();
  function clusterSize(item) {
    if (memo.has(item)) return memo.get(item);
    const kids = childGroups(item);
    const sizeOf = (list, dim) => list.reduce((sum, child) => sum + clusterSize(child)[dim], 0);
    const maxOf = (list, dim) => list.reduce((max, child) => Math.max(max, clusterSize(child)[dim]), 0);
    const selfW = item.size.width || item.size.minWidth || 220;
    const selfH = item.size.height || 48;
    const leftW = sizeOf(kids.left, 'width');
    const rightW = sizeOf(kids.right, 'width');
    const beforeH = sizeOf(kids.before, 'height');
    const afterH = sizeOf(kids.after, 'height');
    const sideH = Math.max(selfH, maxOf(kids.left, 'height'), maxOf(kids.right, 'height'));
    const midW = Math.max(selfW, maxOf(kids.before, 'width'), maxOf(kids.after, 'width'));
    const result = {
      width: leftW + midW + rightW,
      height: beforeH + sideH + afterH,
      selfW,
      selfH,
      leftW,
      beforeH,
      sideH,
      kids,
    };
    memo.set(item, result);
    return result;
  }
  return clusterSize;
}

function placeDepth(item) {
  let depth = 0;
  let cur = item;
  const seen = new Set();
  while (cur?.place.relativeTo) {
    if (seen.has(cur.place.placedAt)) break;
    seen.add(cur.place.placedAt);
    depth += 1;
    cur = ghostByPlacedAt(cur.place.relativeTo);
    if (!cur || depth > 8) break;
  }
  return depth;
}

function findGhostCell(item, slot) {
  if (!item?.shadow || !slot) return null;
  const table = item.shadow.querySelector('table, [role="table"], [role="grid"]');
  if (!table) return null;
  const rows = [...table.querySelectorAll('tr, [role="row"]')];
  const row = rows[slot.row];
  if (!row) return null;
  const cells = [...row.querySelectorAll('td, th, [role="cell"], [role="columnheader"], [role="gridcell"]')];
  if (slot.col >= 0 && cells[slot.col]) return cells[slot.col];
  return cells[0] || row;
}

function insideAnchorBox(parent, child) {
  const slot = child.place.slot;
  if (slot && (slot.row >= 0 || slot.col >= 0)) {
    const cell = findGhostCell(parent, slot);
    if (cell) {
      const box = cell.getBoundingClientRect();
      return { left: box.left + 4, top: box.top + 4, width: Math.max(64, box.width - 8) };
    }
  }
  const host = parent.ghost.getBoundingClientRect();
  const inset = child.place.inset || { x: 0.08, y: 0.18 };
  const width = Math.min(child.size.width || child.size.minWidth || 160, Math.max(64, host.width - 16));
  return {
    left: host.left + inset.x * host.width,
    top: host.top + inset.y * host.height,
    width,
  };
}

function layoutSubtree(item, left, top, clusterSize) {
  const cluster = clusterSize(item);
  const selfLeft = left + cluster.leftW;
  const selfTop = top + cluster.beforeH;
  item.ghost.style.left = `${Math.max(8, Math.round(selfLeft))}px`;
  item.ghost.style.top = `${Math.max(8, Math.round(selfTop))}px`;
  item.ghost.style.width = `${cluster.selfW}px`;
  item.ghost.style.zIndex = String(2147483645 + placeDepth(item));

  let y = top;
  for (const child of cluster.kids.before) {
    layoutSubtree(child, selfLeft, y, clusterSize);
    y += clusterSize(child).height;
  }
  let x = left;
  for (const child of cluster.kids.left) {
    layoutSubtree(child, x, selfTop, clusterSize);
    x += clusterSize(child).width;
  }
  x = selfLeft + cluster.selfW;
  for (const child of cluster.kids.right) {
    layoutSubtree(child, x, selfTop, clusterSize);
    x += clusterSize(child).width;
  }
  y = selfTop + cluster.sideH;
  for (const child of cluster.kids.after) {
    layoutSubtree(child, selfLeft, y, clusterSize);
    y += clusterSize(child).height;
  }
  for (const child of cluster.kids.inside || []) {
    const box = insideAnchorBox(item, child);
    child.size.width = Math.min(child.size.width || child.size.minWidth || 160, box.width);
    const nested = clusterSize(child);
    layoutSubtree(child, box.left - nested.leftW, box.top - nested.beforeH, clusterSize);
  }
}

function syncPlaceGaps() {
  clearPlaceGap();
  const clusterSize = makeClusterSize();
  const map = new Map();
  for (const item of placeGhosts) {
    if (item.overlay || !item.el || !item.el.isConnected || !isPlaceRoot(item)) continue;
    const rec = map.get(item.el) || { before: 0, after: 0, left: 0, right: 0 };
    const cluster = clusterSize(item);
    if (item.position === 'inside') {
      map.set(item.el, rec);
      continue;
    }
    if (item.position === 'before') rec.before += cluster.height;
    else if (item.position === 'left') rec.left += cluster.width;
    else if (item.position === 'right') rec.right += cluster.width;
    else rec.after += cluster.height;
    map.set(item.el, rec);
  }
  for (const [el, rec] of map) applyCombinedGap(el, rec);
}

function retitlePlaceGhosts() {
  placeGhosts.forEach((item, index) => {
    item.place.index = index + 1;
    const num = item.shadow.querySelector('.num');
    if (num) num.textContent = String(index + 1);
  });
}

function ghostSlot(position) {
  if (position === 'before' || position === 'left' || position === 'right' || position === 'inside') return position;
  return 'after';
}

function layoutAllPlaceGhosts() {
  placeGhosts = placeGhosts.filter((item) => {
    if (item.el && item.el.isConnected) return true;
    unmountGhostStage(item);
    item.ghost.remove();
    return false;
  });
  const clusterSize = makeClusterSize();
  syncPlaceGaps();
  const groups = new Map();
  for (const item of placeGhosts) {
    if (item.overlay) {
      const width = Math.min(420, Math.max(item.size.minWidth, 360));
      item.size.width = width;
      layoutSubtree(
        item,
        Math.max(8, (window.innerWidth - clusterSize(item).width) / 2),
        Math.max(24, (window.innerHeight - clusterSize(item).height) / 2 + (item.place.index - 1) * 16),
        clusterSize
      );
      continue;
    }
    if (!isPlaceRoot(item)) continue;
    if (!groups.has(item.el)) groups.set(item.el, { before: [], after: [], left: [], right: [], inside: [] });
    groups.get(item.el)[ghostSlot(item.position)].push(item);
  }
  for (const [el, slots] of groups) {
    const rect = el.getBoundingClientRect();
    const blockWidth = Math.max(200, Math.min(Math.round(rect.width) || 280, window.innerWidth - 16));
    const blockLeft = Math.max(8, Math.round(rect.left));
    const topAlign = Math.max(8, Math.round(rect.top));
    let top = rect.top - slots.before.reduce((sum, item) => sum + clusterSize(item).height, 0);
    for (const item of slots.before) {
      item.size.width = item.size.width || blockWidth;
      layoutSubtree(item, blockLeft, top, clusterSize);
      top += clusterSize(item).height;
    }
    top = rect.bottom;
    for (const item of slots.after) {
      item.size.width = item.size.width || blockWidth;
      layoutSubtree(item, blockLeft, top, clusterSize);
      top += clusterSize(item).height;
    }
    let x = rect.left - slots.left.reduce((sum, item) => sum + clusterSize(item).width, 0);
    for (const item of slots.left) {
      layoutSubtree(item, x, topAlign, clusterSize);
      x += clusterSize(item).width;
    }
    x = rect.right;
    for (const item of slots.right) {
      layoutSubtree(item, x, topAlign, clusterSize);
      x += clusterSize(item).width;
    }
    for (const item of slots.inside || []) {
      const inset = item.place.inset || { x: 0.08, y: 0.12 };
      layoutSubtree(
        item,
        rect.left + inset.x * rect.width,
        rect.top + inset.y * rect.height,
        clusterSize
      );
    }
  }
  if (!placeGhosts.some((item) => item.overlay) && placeGhostDim) {
    placeGhostDim.remove();
    placeGhostDim = null;
  }
}

function unmountGhostStage(item) {
  const stage = item.shadow?.querySelector('.stage');
  if (stage && window.ForgePalette?.unmount) window.ForgePalette.unmount(stage);
}

function reparentPlaceChildren(item) {
  const parentId = item.place.placedAt;
  const nextRelative = item.place.relativeTo || null;
  for (const child of placeGhosts) {
    if (child === item || child.place.relativeTo !== parentId) continue;
    child.place.relativeTo = nextRelative;
    if (!nextRelative) {
      child.el = item.el;
      child.position = item.position;
      child.place.position = item.position;
      child.place.pick = item.place.pick;
    }
  }
}

function removePlaceGhost(item) {
  reparentPlaceChildren(item);
  unmountGhostStage(item);
  item.ghost.remove();
  placeGhosts = placeGhosts.filter((entry) => entry !== item);
  if (!placeGhosts.some((entry) => entry.overlay) && placeGhostDim) {
    placeGhostDim.remove();
    placeGhostDim = null;
  }
  if (!placeGhosts.length) {
    teardownPlaceGhostListeners();
    clearPlaceGap();
    document.querySelectorAll('.gcb-place-ghost, #gcb-place-ghost, #gcb-place-dim').forEach((node) => node.remove());
  } else {
    retitlePlaceGhosts();
    layoutAllPlaceGhosts();
  }
}

function undoLastPlaceGhost() {
  const item = placeGhosts[placeGhosts.length - 1];
  if (!item) return;
  removePlaceGhost(item);
  broadcastPlaces();
}

function dismissPlaceGhostItem(item) {
  if (!item || !placeGhosts.includes(item)) return;
  removePlaceGhost(item);
  broadcastPlaces();
}

function dismissPlaceGhost() {
  teardownPlaceGhostListeners();
  for (const item of placeGhosts) {
    unmountGhostStage(item);
    item.ghost.remove();
  }
  placeGhosts = [];
  if (placeGhostDim) {
    placeGhostDim.remove();
    placeGhostDim = null;
  }
  clearPlaceGap();
  document.querySelectorAll('.gcb-place-ghost, #gcb-place-ghost, #gcb-place-dim').forEach((node) => node.remove());
}

function restorePlaceGhosts(places) {
  if (placeGhosts.length || !Array.isArray(places) || !places.length) return;
  const byId = new Map();
  for (const saved of places) {
    if (!saved?.component) continue;
    let el = null;
    if (saved.relativeTo && byId.has(saved.relativeTo)) {
      el = byId.get(saved.relativeTo).el;
    }
    if (!el && saved.pick?.selector) el = queryOne(saved.pick.selector);
    if (!el) continue;
    const place = { ...saved, url: location.href, title: document.title };
    const item = showPlaceGhost(el, saved.position || 'after', saved.component, place);
    if (item && saved.placedAt) byId.set(saved.placedAt, item);
  }
}

function markPlaceGhostCommitted() {
  for (const item of placeGhosts) {
    item.ghost.setAttribute('data-gcb-committed', '1');
  }
}

function showPlaceGhost(el, position, component, place) {
  const kind = component.kind || '';
  const size = ghostSizeFor(kind);
  const overlay = kind === 'dialog';
  if (overlay && !placeGhostDim) {
    placeGhostDim = document.createElement('div');
    placeGhostDim.id = 'gcb-place-dim';
    placeGhostDim.setAttribute('data-gcb-picker', '1');
    document.documentElement.appendChild(placeGhostDim);
  }

  const ghost = document.createElement('div');
  ghost.className = 'gcb-place-ghost';
  ghost.setAttribute('data-gcb-picker', '1');
  const bare = ['button', 'filter', 'iconbtn', 'chip', 'toggle', 'pager', 'crumbs', 'link', 'tabs'].includes(kind);
  ghost.style.position = 'fixed';
  ghost.style.zIndex = '2147483645';
  const shadow = ghost.attachShadow({ mode: 'open' });
  const index = placeGhosts.length + 1;
  place.index = index;
  const kit = chrome.runtime.getURL('vendor/forge-kit.css');
  shadow.innerHTML =
    `<style>${PLACE_GHOST_CSS}</style>` +
    `<link rel="stylesheet" href="${kit}">` +
    `<div class="wrap${bare ? ' bare' : ''}">` +
      `<span class="num">${index}</span>` +
      `<button class="close" type="button" aria-label="删除预览" title="删除">` +
        `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">` +
          `<path d="m15 9-6 6m0-6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
        `</svg>` +
      `</button>` +
      `<div class="stage"></div>` +
    `</div>`;
  const stage = shadow.querySelector('.stage');
  const rect = el.getBoundingClientRect();
  const side = position === 'left' || position === 'right';
  ghost.style.width = `${overlay
    ? Math.min(420, Math.max(280, Math.round(rect.width) || 360))
    : side
      ? size.minWidth
      : Math.max(200, Math.min(Math.round(rect.width) || 280, window.innerWidth - 16))}px`;
  document.documentElement.appendChild(ghost);

  const item = { el, position, component, place, ghost, shadow, size, overlay };
  placeGhosts.push(item);
  const closeBtn = shadow.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      dismissPlaceGhostItem(item);
    });
    closeBtn.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });
  }
  ensurePlaceGhostListeners();
  layoutAllPlaceGhosts();

  const api = window.ForgePalette;
  const link = shadow.querySelector('link');
  const paint = () => {
    if (api?.mount) api.mount(stage, { ...component, surface: 'ghost' });
    else stage.textContent = component.exportName || component.name || 'Forge';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const box = ghost.getBoundingClientRect();
        const inner = stage.getBoundingClientRect();
        size.height = Math.max(Math.round(box.height), Math.round(inner.height), 48);
        size.width = Math.round(box.width) || size.minWidth;
        layoutAllPlaceGhosts();
      });
    });
    setTimeout(() => {
      const box = ghost.getBoundingClientRect();
      const inner = stage.getBoundingClientRect();
      size.height = Math.max(Math.round(box.height), Math.round(inner.height), 48);
      size.width = Math.round(box.width) || size.minWidth;
      layoutAllPlaceGhosts();
    }, 80);
  };
  if (link) {
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      paint();
    };
    link.addEventListener('load', run);
    link.addEventListener('error', run);
    setTimeout(run, 400);
  } else {
    paint();
  }
  return item;
}

function startPlacer(component) {
  if (overlaySession) stopOverlay({ cancelled: true });
  const block = component && component.name ? component : { name: 'Forge 组件' };

  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });

  const root = createOverlayRoot(
    '<div id="gcb-place-line" data-gcb-picker="1"></div>'
  );

  const line = root.querySelector('#gcb-place-line');
  let hovered = null;
  let hoverGhost = null;
  let hoverSlot = null;
  let position = 'after';

  function paintLine(rect, nextPosition) {
    const nested = nextPosition === 'inside';
    line.classList.toggle('is-vertical', nextPosition === 'left' || nextPosition === 'right');
    line.classList.toggle('is-inside', nested);
    line.style.display = 'block';
    if (nested) {
      line.style.width = `${Math.max(8, Math.round(rect.width))}px`;
      line.style.height = `${Math.max(8, Math.round(rect.height))}px`;
      line.style.left = `${Math.round(rect.left)}px`;
      line.style.top = `${Math.round(rect.top)}px`;
      return;
    }
    const vertical = nextPosition === 'left' || nextPosition === 'right';
    if (vertical) {
      line.style.width = '2px';
      line.style.height = `${Math.max(1, Math.round(rect.height))}px`;
      line.style.left = `${Math.round(nextPosition === 'left' ? rect.left : rect.right)}px`;
      line.style.top = `${Math.round(rect.top)}px`;
    } else {
      line.style.height = '2px';
      line.style.width = `${Math.max(1, Math.round(rect.width))}px`;
      line.style.left = `${Math.round(rect.left)}px`;
      line.style.top = `${Math.round(nextPosition === 'before' ? rect.top : rect.bottom)}px`;
    }
  }

  function paint(el, event) {
    if (event) {
      hoverGhost = null;
      hoverSlot = null;
      const ghostHit = nearestGhostTarget(event.clientX, event.clientY);
      const target = el && el !== document.documentElement && el !== document.body
        ? placeBlockTarget(el)
        : null;
      const pageHit = target ? closestEdge(target.getBoundingClientRect(), event.clientX, event.clientY) : null;
      const preferGhost = ghostHit && (
        ghostHit.inside
        || (pageHit?.inside && ghostHit.approach < 24)
        || (!pageHit?.inside && ghostHit.approach <= (pageHit ? pageHit.approach : Infinity) + 8)
      );
      if (preferGhost) {
        hoverGhost = ghostHit.item;
        hoverSlot = ghostHit.slot || null;
        hovered = hoverGhost.el;
        position = ghostHit.position;
        paintLine(ghostHit.rect, position);
        return;
      }
      if (target) {
        hovered = target;
        const large = Math.min(pageHit.rect.width, pageHit.rect.height) > 96;
        if (pageHit.inside && pageHit.inset > 28 && large) {
          position = 'inside';
          paintLine(pageHit.rect, 'inside');
          return;
        }
        position = pageHit.position;
        paintLine(pageHit.rect, position);
        return;
      }
      line.style.display = 'none';
      return;
    }
    if (hoverGhost) {
      paintLine(hoverGhost.ghost.getBoundingClientRect(), position);
      return;
    }
    if (hovered && hovered !== document.documentElement && hovered !== document.body) {
      const target = placeBlockTarget(hovered);
      const rect = target.getBoundingClientRect();
      paintLine(rect, position);
      hovered = target;
      return;
    }
    line.style.display = 'none';
  }

  function targetFromEvent(event) {
    let el = event.target;
    if (el && el.nodeType !== 1) el = el.parentElement;
    if (overlayIgnore(el, event)) return hovered;
    return el;
  }

  const onMove = (event) => {
    paint(targetFromEvent(event), event);
  };
  const onScroll = () => paint(hovered);
  const onClick = (event) => {
    if (overlayIgnore(event.target, event)) return;
    event.preventDefault();
    event.stopPropagation();
    paint(targetFromEvent(event), event);
    const parentGhost = hoverGhost;
    const el = parentGhost?.el || placeBlockTarget(hovered || targetFromEvent(event));
    const pick = parentGhost?.place?.pick || describeElement(el);
    if (!pick || !el) {
      stopOverlay({ cancelled: true, error: 'no element' });
      return;
    }
    const nextPosition = position;
    const hostRect = parentGhost?.ghost.getBoundingClientRect() || el.getBoundingClientRect();
    const place = {
      placedAt: new Date().toISOString(),
      url: location.href,
      title: document.title,
      position: nextPosition,
      relativeTo: parentGhost ? parentGhost.place.placedAt : null,
      slot: nextPosition === 'inside' ? hoverSlot : null,
      inset: nextPosition === 'inside'
        ? {
            x: (event.clientX - hostRect.left) / Math.max(hostRect.width, 1),
            y: (event.clientY - hostRect.top) / Math.max(hostRect.height, 1),
          }
        : null,
      component: block,
      pick,
    };
    showPlaceGhost(el, nextPosition, block, place);
    const places = placeListPayload();
    try {
      chrome.runtime.sendMessage({ type: 'place-preview', place, places, layout: layoutComposition(places) });
    } catch {}
    stopOverlay({ ok: true, preview: true, place, places });
  };

  attachOverlay({ root, onMove, onClick, onScroll, resolve, cursor: 'copy' });
  overlaySession.promise = promise;
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

function pageIsBackground() {
  return document.hidden || document.visibilityState === 'hidden';
}

function safeFocus(el) {
  if (!el || typeof el.focus !== 'function') return;
  // Focusing a control in a background tab brings Chrome (and this tab) to
  // the front on macOS. Only focus when the user is already looking here.
  if (pageIsBackground()) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {}
  }
}

async function typeText(el, text, opts = {}) {
  safeFocus(el);
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
    chrome.runtime.sendMessage({ type: 'amIAgentTab' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.isAgent) window.__gcbAgent?.enable();
    });
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
  const arrowSvg =
    '<svg viewBox="150 40 680 880" width="23" height="30" aria-hidden="true"><path d="M174.08 113.39264l7.43424 646.56896c0.38912 33.95072 28.11392 61.1584 61.9264 60.76416a61.07136 61.07136 0 0 0 39.38816-15.01696l156.65152-136.36096 159.73376 277.82656c16.90624 29.39904 54.3488 39.4752 83.63008 22.49728l67.11296-38.912c29.2864-16.9728 39.31648-54.57408 22.41024-83.97312l-159.73376-277.82656 196.06016-68.096c31.95392-11.10016 48.896-46.11072 37.84704-78.19776a61.42464 61.42464 0 0 0-26.59328-32.75776L266.56256 59.83232c-29.06624-17.34144-66.63168-7.7312-83.89632 21.45792A61.71648 61.71648 0 0 0 174.08 113.39264z" fill="#111" stroke="#fff" stroke-width="72" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  if (el && document.documentElement.contains(el)) {
    const arrow = el.querySelector('.gcb-agent-cursor-arrow');
    if (arrow) arrow.innerHTML = arrowSvg;
    return el;
  }
  el = document.createElement('div');
  el.id = 'gcb-agent-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    `<span class="gcb-agent-cursor-arrow">${arrowSvg}</span><span class="gcb-agent-cursor-ring"></span>`;
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
    // Must not hang on background agent tabs (rAF is throttled/paused there).
    await nextFrames(2, 48);
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
 * On a background agent tab, if nothing (e.g. SPA router) prevented the
 * default, block browser link navigation that can surface this tab and
 * navigate with location.assign instead (stays background).
 */
function dispatchPointerClick(el, x, y) {
  const target = el;
  const common = { pointerId: 1, pointerType: 'mouse', isPrimary: true };
  const background = pageIsBackground();
  const anchor = target.closest?.('a[href]') || null;

  // Mark bridge-driven clicks so agent-ui can skip its reactive move/click
  // feedback (cursor already arrived before this sequence runs).
  window.__gcbBridgeClicking = true;
  // Bubble on document runs after React root handlers — see if they preventDefault.
  let silentAnchorBlocker = null;
  if (background && anchor) {
    silentAnchorBlocker = (event) => {
      if (event.defaultPrevented) return;
      if (!anchor.contains(event.target) && event.target !== anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      if (anchor.target && anchor.target !== '_self') return;
      event.preventDefault();
      try {
        const next = anchor.href;
        if (next && next !== location.href) location.assign(next);
      } catch {}
    };
    document.addEventListener('click', silentAnchorBlocker, false);
  }
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
    safeFocus(target);
    target.dispatchEvent(
      new PointerEvent('pointerup', mouseEventInit(x, y, { ...common, buttons: 0, detail: 1 }))
    );
    target.dispatchEvent(new MouseEvent('mouseup', mouseEventInit(x, y, { buttons: 0, detail: 1 })));
    target.dispatchEvent(new MouseEvent('click', mouseEventInit(x, y, { buttons: 0, detail: 1 })));
  } finally {
    if (silentAnchorBlocker) {
      document.removeEventListener('click', silentAnchorBlocker, false);
    }
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
      safeFocus(el);
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

window.__gcbContentVersion = '0.3.29';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ping') {
    sendResponse({
      ok: true,
      version: window.__gcbContentVersion || null,
      palette: typeof window.ForgePalette?.mount === 'function',
    });
    return true;
  }

  if (msg.type === 'agent-ui-enable') {
    try {
      if (msg.enabled === false) window.__gcbAgent?.disable();
      else if (!msg.trusted) window.__gcbAgent?.enable();
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

  if (msg.type === 'describe-selector') {
    try {
      const el = queryOne(msg.selector);
      if (!el) {
        sendResponse({ error: `Element not found: ${msg.selector}` });
        return true;
      }
      sendResponse({ pick: describeElement(el) });
    } catch (err) {
      sendResponse({ error: err.message || String(err) });
    }
    return true;
  }

  if (msg.type === 'place-start') {
    startPlacer(msg.component)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true;
  }

  if (msg.type === 'picker-cancel' || msg.type === 'place-cancel') {
    stopOverlay({ cancelled: true });
    dismissPlaceGhost();
    sendResponse({ cancelled: true });
    return true;
  }

  if (msg.type === 'place-dismiss') {
    stopOverlay({ cancelled: true });
    undoLastPlaceGhost();
    sendResponse({ cancelled: true });
    return true;
  }

  if (msg.type === 'place-commit') {
    markPlaceGhostCommitted();
    const places = placeListPayload();
    sendResponse({ ok: true, places, layout: layoutComposition(places) });
    return true;
  }

  if (msg.type === 'place-restore') {
    restorePlaceGhosts(msg.places);
    sendResponse({ ok: true, places: placeListPayload() });
    return true;
  }

  if (msg.type === 'dom') {
    handleDomCommand(msg.command, msg.args || {})
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true;
  }
});

try {
  chrome.runtime.sendMessage({ type: 'place-restore-request', url: location.href }, (res) => {
    void chrome.runtime.lastError;
    if (!res?.places?.length) return;
    restorePlaceGhosts(res.places);
    if (placeGhosts.length) broadcastPlaces();
  });
} catch {}
})();
