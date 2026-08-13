/**
 * Forge Design — background service worker
 *
 * Connects to a local control server over WebSocket and executes browser commands
 * inside the user's real Chrome (tabs + content scripts).
 *
 * Silent mode (default): all automation runs in a dedicated background agent tab
 * and must NOT steal focus from the tab the user is working in.
 */

const DEFAULT_PORT = 3847;
const RECONNECT_MS = 2000;
const AGENT_TAB_TITLE_MARK = '[grok-agent]';

let port = DEFAULT_PORT;
let token = null;
let ws = null;
let connected = false;
let reconnectTimer = null;
let lastError = null;
let actionLog = [];
/** Dedicated background tab id for silent automation */
let agentTabId = null;
/** Last element the user pointed at in picker mode */
let lastPick = null;
/** Last Forge block the user placed onto the page */
let lastPlace = null;

function logAction(entry) {
  actionLog.unshift({ ...entry, ts: Date.now() });
  if (actionLog.length > 50) actionLog.length = 50;
  chrome.runtime.sendMessage({ type: 'log', entry: actionLog[0] }).catch(() => {});
}

async function loadConfig() {
  const data = await chrome.storage.local.get(['port', 'token', 'agentTabId', 'lastPick', 'lastPlace']);
  port = data.port || DEFAULT_PORT;
  token = data.token || null;
  agentTabId = data.agentTabId || null;
  lastPick = data.lastPick || null;
  lastPlace = data.lastPlace || null;
}

async function saveConfig(partial) {
  if (partial.port != null) port = partial.port;
  if (partial.token != null) token = partial.token;
  if (partial.agentTabId !== undefined) agentTabId = partial.agentTabId;
  const toSave = { port, token };
  if (partial.agentTabId !== undefined) toSave.agentTabId = partial.agentTabId;
  await chrome.storage.local.set(toSave);
}

function broadcastStatus() {
  chrome.runtime
    .sendMessage({
      type: 'status',
      data: {
        connected,
        port,
        hasToken: !!token,
        lastError,
        lastPick,
        lastPlace,
        log: actionLog.slice(0, 20),
      },
    })
    .catch(() => {});
}

async function saveLastPick(pick) {
  lastPick = pick;
  await chrome.storage.local.set({ lastPick: pick });
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: 'pick', pick }));
    } catch {}
  }
  chrome.runtime.sendMessage({ type: 'lastPick', pick }).catch(() => {});
}

async function saveLastPlace(place) {
  lastPlace = place;
  await chrome.storage.local.set({ lastPlace: place });
  const pick = place?.pick || place?.place?.pick || place?.places?.[0]?.pick;
  if (pick) await saveLastPick(pick);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: 'place', place }));
    } catch {}
  }
  chrome.runtime.sendMessage({ type: 'lastPlace', place }).catch(() => {});
}

function pageKey(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url || '';
  }
}

async function savePendingPlaces(tabId, payload) {
  if (!tabId) return;
  try {
    const data = await chrome.storage.session.get('pendingPlacesByTab');
    const map = data.pendingPlacesByTab || {};
    if (payload?.places?.length) map[String(tabId)] = payload;
    else delete map[String(tabId)];
    await chrome.storage.session.set({ pendingPlacesByTab: map });
  } catch {}
}

async function loadPendingPlaces(tabId) {
  if (!tabId) return null;
  try {
    const data = await chrome.storage.session.get('pendingPlacesByTab');
    return data.pendingPlacesByTab?.[String(tabId)] || null;
  } catch {
    return null;
  }
}

function isRestrictedUrl(url) {
  return !url || /^(chrome|chrome-extension|edge|about|devtools|brave|opera):/i.test(url);
}

async function getUserFacingTab() {
  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (focused && !isRestrictedUrl(focused.url)) return focused;
  return getActiveTab();
}

async function getPageContext() {
  const tab = await getUserFacingTab();
  if (!tab) return { url: '', title: '', screenshot: null };
  const page = { url: tab.url || '', title: tab.title || '', screenshot: null };
  if (isRestrictedUrl(tab.url) || tab.windowId == null) return page;
  try {
    page.screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 55,
    });
  } catch {}
  return page;
}

async function startPickerOnUserTab() {
  const tab = await getUserFacingTab();
  if (!tab?.id) return { error: 'No active tab' };
  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot pick on this page (chrome:// or similar)' };
  }
  const ok = await ensureContentScript(tab.id, { agentUi: false });
  if (!ok) return { error: 'Cannot inject picker on this page' };
  try {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  } catch {}
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'picker-start' });
    if (result?.pick) await saveLastPick(result.pick);
    return { tabId: tab.id, url: tab.url, ...result };
  } catch (err) {
    return { error: err.message || 'Picker failed' };
  }
}

async function startPlaceOnUserTab(component) {
  const tab = await getUserFacingTab();
  if (!tab?.id) return { error: 'No active tab' };
  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot place on this page (chrome:// or similar)' };
  }
  const ok = await ensureContentScript(tab.id, { agentUi: false });
  if (!ok) return { error: 'Cannot inject placer on this page' };
  try {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  } catch {}
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'place-start', component });
    if (result?.place && !result.preview) await saveLastPlace(result.place);
    return { tabId: tab.id, url: tab.url, ...result };
  } catch (err) {
    return { error: err.message || 'Place failed' };
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_MS);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = `ws://127.0.0.1:${port}/ext`;
  try {
    ws = new WebSocket(url);
  } catch (err) {
    connected = false;
    lastError = err.message;

    broadcastStatus();
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    connected = true;
    lastError = null;

    broadcastStatus();
    ws.send(
      JSON.stringify({
        type: 'hello',
        role: 'extension',
        token: token || null,
        version: chrome.runtime.getManifest().version,
      })
    );
  };

  ws.onmessage = async (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'auth_required') {
      lastError = 'Need token from local server. Start server and reopen the side panel.';
      broadcastStatus();
      return;
    }

    if (msg.type === 'auth_ok') {
      if (msg.token) await saveConfig({ token: msg.token });
      lastError = null;
      broadcastStatus();
      return;
    }

    if (msg.type === 'auth_fail') {
      lastError = msg.error || 'Auth failed';
      broadcastStatus();
      return;
    }

    if (msg.type === 'command') {
      const result = await handleCommand(msg.command, msg.args || {});
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'result',
            id: msg.id,
            ok: !result.error,
            result,
          })
        );
      }
    }
  };

  ws.onclose = () => {
    connected = false;

    broadcastStatus();
    scheduleReconnect();
  };

  ws.onerror = () => {
    lastError = 'WebSocket error (is local server running?)';
    connected = false;

    broadcastStatus();
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function tabExists(tabId) {
  if (!tabId) return false;
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the dedicated silent agent tab.
 * Never focuses the user's current tab. Creates a background tab if needed.
 */
async function ensureAgentTab(preferUrl) {
  if (agentTabId && (await tabExists(agentTabId))) {
    return agentTabId;
  }

  // Reuse a previously marked agent tab if storage was lost
  const all = await chrome.tabs.query({});
  const found = all.find(
    (t) => t.title && t.title.includes(AGENT_TAB_TITLE_MARK)
  );
  if (found?.id) {
    agentTabId = found.id;
    await saveConfig({ agentTabId });
    return agentTabId;
  }

  // New silent background tab — never steals the user's current tab
  const tab = await chrome.tabs.create({
    url: preferUrl || 'about:blank',
    active: false,
  });
  agentTabId = tab.id;
  await saveConfig({ agentTabId });
  // title mark after load
  waitTabComplete(tab.id).then(() => markAgentTabTitle(tab.id));
  return agentTabId;
}

/** Resolve work tab: explicit tabId > agent tab. Never defaults to user active tab. */
async function resolveWorkTabId(args = {}) {
  if (args.tabId) {
    if (await tabExists(args.tabId)) return args.tabId;
  }
  // useActive: true only if caller explicitly wants current tab (rare).
  // Do NOT reassign agentTabId here — operating the active tab once must not
  // permanently mark the user's browsing tab as the silent agent tab.
  if (args.useActive) {
    const active = await getActiveTab();
    if (active?.id) return active.id;
  }
  return ensureAgentTab(args.url);
}

async function enableAgentUi(tabId) {
  // Turn on the visible cursor only for the work/agent tab receiving automation.
  // Never broadcast enable to the user's other tabs.
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'agent-ui-enable', enabled: true });
  } catch {}
}

const CONTENT_SCRIPTS = ['agent-ui.js', 'vendor/forge-palette.js', 'content.js'];

async function ensureContentScript(tabId, opts = {}) {
  const agentUi = opts.agentUi !== false;
  // Prefer ping-first so we do NOT re-inject content.js on every command.
  // Re-injection stacks message listeners and races cursor movement on SPA sites
  // like x.com.
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'ping' });
    if (ping?.ok && !ping.palette) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['vendor/forge-palette.js'],
        });
      } catch {}
    }
    if (ping?.ok) {
      if (agentUi) await enableAgentUi(tabId);
      return true;
    }
  } catch {
    // not injected yet (or context invalidated after navigation)
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['agent-ui.css'],
    });
  } catch {}
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: CONTENT_SCRIPTS,
    });
  } catch {
    // page may block scripting
  }

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'ping' });
    if (agentUi) await enableAgentUi(tabId);
    return true;
  } catch {
    return false;
  }
}

async function markAgentTabTitle(tabId) {
  // Enable agent UI via extension messaging (isolated world), not MAIN world.
  try {
    await ensureContentScript(tabId);
    await enableAgentUi(tabId);
  } catch {}
}

async function sendToTab(tabId, message) {
  const ok = await ensureContentScript(tabId);
  if (!ok) return { error: 'Cannot inject content script on this page (chrome:// or blocked)' };
  // Guarantee cursor UI is on before any DOM command.
  await enableAgentUi(tabId);
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // One retry after re-inject (common after x.com full navigations).
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['agent-ui.css'],
      });
    } catch {}
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: CONTENT_SCRIPTS,
      });
    } catch {}
    try {
      await enableAgentUi(tabId);
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (err2) {
      return { error: err2.message || err.message || 'Content script message failed' };
    }
  }
}

async function handleCommand(command, args) {
  logAction({ command, args });
  try {
    switch (command) {
      case 'status': {
        const userTab = await getActiveTab();
        let agent = null;
        if (agentTabId && (await tabExists(agentTabId))) {
          try {
            agent = await chrome.tabs.get(agentTabId);
          } catch {}
        }
        return {
          connected,
          port,
          silent: true,
          lastPick,
          lastPlace,
          agentTabId: agentTabId || null,
          agentTab: agent
            ? { id: agent.id, url: agent.url, title: agent.title, active: agent.active }
            : null,
          // activeTab kept for compatibility = user-facing tab (NOT work target)
          activeTab: userTab
            ? { id: userTab.id, url: userTab.url, title: userTab.title }
            : null,
          userTab: userTab
            ? { id: userTab.id, url: userTab.url, title: userTab.title }
            : null,
        };
      }

      case 'tabs': {
        const tabs = await chrome.tabs.query({});
        return {
          agentTabId,
          tabs: tabs.map((t) => ({
            id: t.id,
            url: t.url,
            title: t.title,
            active: t.active,
            windowId: t.windowId,
            isAgent: t.id === agentTabId,
          })),
        };
      }

      case 'goto': {
        const url = args.url;
        if (!url) return { error: 'url required' };
        // foreground only when explicitly requested
        const foreground = !!args.foreground || !!args.focus;
        const tabId = await resolveWorkTabId({ ...args, url });
        // Never force active:true unless foreground
        const tab = await chrome.tabs.update(tabId, {
          url,
          ...(foreground ? { active: true } : {}),
        });
        // Only adopt as dedicated agent tab when not a one-off useActive target.
        // useActive means "operate user's current tab this once" — do not permanently
        // hijack that tab as the silent agent workspace.
        if (!args.useActive) {
          agentTabId = tab.id;
          await saveConfig({ agentTabId: tab.id });
          await waitTabComplete(tab.id);
          await markAgentTabTitle(tab.id);
        } else {
          await waitTabComplete(tab.id);
        }
        await ensureContentScript(tab.id);
        return {
          tabId: tab.id,
          url: tab.url || url,
          silent: !foreground,
          agent: !args.useActive,
          useActive: !!args.useActive,
        };
      }

      case 'newtab': {
        // Default silent background tab; set as agent tab
        const foreground = !!args.foreground || !!args.focus;
        const tab = await chrome.tabs.create({
          url: args.url || 'about:blank',
          active: foreground, // default false = silent
        });
        agentTabId = tab.id;
        await saveConfig({ agentTabId: tab.id });
        if (args.url) await waitTabComplete(tab.id);
        await markAgentTabTitle(tab.id);
        await ensureContentScript(tab.id);
        return {
          tabId: tab.id,
          url: tab.url,
          silent: !foreground,
          agent: true,
        };
      }

      case 'activate': {
        // By default: pin agentTabId only, do NOT steal UI focus.
        // Pass focus:true / foreground:true to actually bring tab to front.
        const tabId = args.tabId || (await ensureAgentTab());
        agentTabId = tabId;
        await saveConfig({ agentTabId: tabId });
        const wantFocus = !!args.focus || !!args.foreground;
        if (wantFocus) {
          const tab = await chrome.tabs.update(tabId, { active: true });
          if (tab.windowId) {
            await chrome.windows.update(tab.windowId, { focused: true });
          }
          return {
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            focused: true,
          };
        }
        const tab = await chrome.tabs.get(tabId);
        return {
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
          focused: false,
          note: 'agent tab selected without stealing focus',
        };
      }

      case 'focus': {
        // Explicit focus only
        const tabId = args.tabId || agentTabId;
        if (!tabId) return { error: 'no tab to focus' };
        const tab = await chrome.tabs.update(tabId, { active: true });
        if (tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
        return { tabId: tab.id, url: tab.url, focused: true };
      }

      case 'reload': {
        const tabId = await resolveWorkTabId(args);
        await chrome.tabs.reload(tabId);
        await waitTabComplete(tabId);
        return { tabId };
      }

      case 'url':
      case 'title': {
        const tabId = await resolveWorkTabId(args);
        const tab = await chrome.tabs.get(tabId);
        return { tabId: tab.id, url: tab.url, title: tab.title };
      }

      case 'paste': {
        // Robust text entry for React/contenteditable (e.g. X compose)
        const tabId = await resolveWorkTabId(args);
        const tab = { id: tabId };
        if (!tab?.id) return { error: 'No tab' };
        const text = args.text ?? '';
        const selector = args.selector || 'div[role=textbox]';
        await ensureContentScript(tabId);
        // Contract: always move the visible cursor onto the field and click
        // it via the content-script path before any paste side-effects.
        try {
          await sendToTab(tabId, {
            type: 'dom',
            command: 'click',
            args: { selector },
          });
        } catch {}
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            args: [selector, text],
            func: async (sel, value) => {
              const el = document.querySelector(sel);
              if (!el) return { error: `Element not found: ${sel}` };
              // Field was already focused/clicked by content-script humanClick.
              try {
                el.focus({ preventScroll: true });
              } catch {
                el.focus();
              }
              await new Promise((r) => setTimeout(r, 40));
              try {
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
              } catch {}
              // Prefer paste into page main world so React picks it up
              try {
                const dt = new DataTransfer();
                dt.setData('text/plain', value);
                el.dispatchEvent(
                  new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dt,
                  })
                );
              } catch {}
              // insertText fallback
              const current = (el.innerText || el.value || '').trim();
              if (!current) {
                try {
                  document.execCommand('insertText', false, value);
                } catch {
                  if ('value' in el) el.value = value;
                  else el.textContent = value;
                }
                el.dispatchEvent(
                  new InputEvent('input', {
                    bubbles: true,
                    data: value,
                    inputType: 'insertText',
                  })
                );
              }
              await new Promise((r) => setTimeout(r, 80));
              const out = el.innerText || el.value || '';
              return { ok: true, value: out.slice(0, 500), len: out.length };
            },
          });
          return { tabId: tab.id, ...(result || {}) };
        } catch (err) {
          return { tabId: tab.id, error: err.message || String(err) };
        }
      }

      case 'text':
      case 'snapshot':
      case 'click':
      case 'fill':
      case 'type':
      case 'press':
      case 'scroll':
      case 'wait':
      case 'exists':
      case 'eval':
      case 'select':
      case 'getValue': {
        // DOM ops always use agent/work tab — never user's active tab by default
        const tabId = await resolveWorkTabId(args);
        if (!tabId) return { error: 'No tab' };
        if (command === 'wait' && args.urlIncludes) {
          await waitTabUrl(tabId, args.urlIncludes, args.timeoutMs || 15000);
        }
        const result = await sendToTab(tabId, {
          type: 'dom',
          command,
          args,
        });
        return { tabId, ...result };
      }

      case 'start-pick':
      case 'startPick': {
        return startPickerOnUserTab();
      }

      case 'start-place':
      case 'startPlace': {
        return startPlaceOnUserTab(args.component || args);
      }

      case 'cancel-pick':
      case 'cancelPick':
      case 'cancel-place':
      case 'cancelPlace': {
        const tab = await getUserFacingTab();
        if (!tab?.id) return { cancelled: true };
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'place-cancel' });
        } catch {}
        await savePendingPlaces(tab.id, null);
        return { cancelled: true };
      }

      case 'last-pick':
      case 'lastPick': {
        return { pick: lastPick };
      }

      case 'last-place':
      case 'lastPlace': {
        const places = Array.isArray(lastPlace?.places)
          ? lastPlace.places
          : lastPlace?.component
            ? [lastPlace]
            : [];
        return {
          place: lastPlace?.place || lastPlace,
          places,
          layout: lastPlace?.layout || null,
        };
      }

      // focus element inside page (not browser tab focus)
      case 'focusElement': {
        const tabId = await resolveWorkTabId(args);
        const result = await sendToTab(tabId, {
          type: 'dom',
          command: 'focus',
          args,
        });
        return { tabId, ...result };
      }

      default:
        return { error: `Unknown command: ${command}` };
    }
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

function waitTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        finish();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((t) => {
      if (t.status === 'complete') {
        clearTimeout(timer);
        finish();
      }
    }).catch(finish);
  });
}

function waitTabUrl(tabId, includes, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.url && tab.url.includes(includes)) return resolve(tab.url);
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('wait url timeout'));
      setTimeout(tick, 300);
    };
    tick();
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;

  // Content script asks if this tab is the silent agent tab
  if (msg.type === 'amIAgentTab') {
    const isAgent = !!(sender.tab && sender.tab.id === agentTabId);
    sendResponse({ isAgent, agentTabId });
    return true;
  }

  if (msg.type === 'getStatus') {
    sendResponse({
      connected,
      port,
      hasToken: !!token,
      lastError,
      lastPick,
      lastPlace,
      agentTabId,
      silent: true,
      log: actionLog.slice(0, 20),
    });
    return true;
  }

  if (msg.type === 'pageContext') {
    getPageContext().then(sendResponse);
    return true;
  }

  if (msg.type === 'startPick') {
    startPickerOnUserTab().then(sendResponse);
    return true;
  }

  if (msg.type === 'startPlace') {
    startPlaceOnUserTab(msg.component).then(sendResponse);
    return true;
  }

  if (msg.type === 'cancelPick' || msg.type === 'cancelPlace') {
    handleCommand('cancel-pick', {}).then(sendResponse);
    return true;
  }

  if (msg.type === 'getLastPick') {
    sendResponse({ pick: lastPick });
    return true;
  }

  if (msg.type === 'getLastPlace') {
    sendResponse({ place: lastPlace });
    return true;
  }

  if (msg.type === 'picker-result' && msg.pick) {
    saveLastPick(msg.pick).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'place-preview' && (msg.place || msg.places?.length)) {
    const tabId = sender.tab?.id;
    const place = msg.place ? { ...msg.place, tabId } : null;
    const places = Array.isArray(msg.places)
      ? msg.places.map((item) => ({ ...item, tabId }))
      : place
        ? [place]
        : [];
    savePendingPlaces(tabId, {
      url: sender.tab?.url || places[0]?.url || '',
      places,
      layout: msg.layout || null,
    }).catch(() => {});
    chrome.runtime.sendMessage({
      type: 'placePreview',
      place: places[places.length - 1] || place,
      places,
      layout: msg.layout || null,
    }).catch(() => {});
    sendResponse({ ok: true, place, places });
    return true;
  }

  if (msg.type === 'place-dismiss') {
    savePendingPlaces(sender.tab?.id, null).catch(() => {});
    chrome.runtime.sendMessage({ type: 'placeDismiss' }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'place-restore-request') {
    loadPendingPlaces(sender.tab?.id).then((saved) => {
      const same = saved?.url && pageKey(saved.url) === pageKey(msg.url || sender.tab?.url || '');
      sendResponse({ places: same ? saved.places : [] });
    }).catch(() => sendResponse({ places: [] }));
    return true;
  }

  if (msg.type === 'getPendingPlaces') {
    (async () => {
      const tab = await getUserFacingTab();
      const saved = tab?.id ? await loadPendingPlaces(tab.id) : null;
      sendResponse({ places: saved?.places || [], layout: saved?.layout || null });
    })();
    return true;
  }

  if (msg.type === 'place-result' && msg.place) {
    saveLastPlace(msg.place).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'commitPlace' && (msg.places?.length || msg.place)) {
    (async () => {
      let places = Array.isArray(msg.places) && msg.places.length ? msg.places : [msg.place];
      let layout = msg.layout || null;
      const tabId = places[0]?.tabId || msg.place?.tabId || (await getUserFacingTab())?.id;
      if (tabId) {
        try {
          const snap = await chrome.tabs.sendMessage(tabId, { type: 'place-commit' });
          if (snap?.places?.length) places = snap.places;
          if (snap?.layout) layout = snap.layout;
        } catch {}
        await savePendingPlaces(tabId, null);
      }
      await saveLastPlace({
        places,
        place: places[0],
        layout,
        placedAt: new Date().toISOString(),
      });
      sendResponse({ ok: true, places, layout });
    })();
    return true;
  }

  if (msg.type === 'setConfig') {
    saveConfig({
      port: msg.port != null ? Number(msg.port) : undefined,
      token: msg.token != null ? msg.token : undefined,
    }).then(() => {
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      connect();
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'reconnect') {
    if (ws) {
      try {
        ws.close();
      } catch {}
    }
    connect();
    sendResponse({ ok: true });
    return true;
  }
});

if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.tabs.onRemoved.addListener((tabId) => {
  savePendingPlaces(tabId, null).catch(() => {});
});

// Keep service worker from dying forever without reconnect attempts
chrome.alarms.create('bridge-keepalive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'bridge-keepalive') {
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      connect();
    } else if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'ping' }));
      } catch {}
    }
  }
});

loadConfig().then(() => {
  chrome.action.setBadgeText({ text: '' }).catch(() => {});
  connect();
});
