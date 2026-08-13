const thread = document.getElementById('thread');
const empty = document.getElementById('empty');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const composer = document.getElementById('composer');
const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menuBtn');
const sessionList = document.getElementById('sessionList');
const chatTitle = document.getElementById('chatTitle');
const pickBtn = document.getElementById('pickBtn');
const pickLabel = document.getElementById('pickLabel');
const clearPickBtn = document.getElementById('clearPickBtn');
const sessionEmpty = document.getElementById('sessionEmpty');
const sessionSearch = document.getElementById('sessionSearch');
const moreBtn = document.getElementById('moreBtn');
const moreMenu = document.getElementById('moreMenu');
const bridgeSwitch = document.getElementById('bridgeSwitch');
const bridgeState = document.getElementById('bridgeState');
const dirList = document.getElementById('dirList');
const dirNow = document.getElementById('dirNow');
const dirForm = document.getElementById('dirForm');
const dirInput = document.getElementById('dirInput');

let port = 3847;
let token = '';
let sessions = [];
let directories = [];
let currentCwd = '';
let current = { id: null, cwd: null, title: '新对话', messages: [] };
let includePick = false;
let lastPick = null;
let sending = false;
let stickToBottom = true;
let activeAbort = null;

const SEND_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M12 20V4m0 0 6 6m-6-6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const STOP_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor"/></svg>';

function folderName(dir) {
  if (!dir) return '';
  return dir.split('/').filter(Boolean).pop() || dir;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeMarkdown(html) {
  const allowed = new Set([
    'A', 'P', 'BR', 'STRONG', 'EM', 'B', 'I', 'CODE', 'PRE', 'SPAN',
    'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'HR',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
  ]);
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  wrap.querySelectorAll('*').forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (node.tagName === 'A' && name === 'href' && /^(https?:|mailto:|#)/i.test(attr.value)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noreferrer');
        return;
      }
      node.removeAttribute(attr.name);
    });
  });
  return wrap.innerHTML;
}

function formatText(text, asMarkdown) {
  if (!asMarkdown || typeof marked === 'undefined') {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
  const html = marked.parse(String(text || ''), {
    gfm: true,
    breaks: true,
  });
  return sanitizeMarkdown(html);
}

function apiUrl(pathname) {
  return `http://127.0.0.1:${port}${pathname}`;
}

async function api(pathname, options = {}) {
  const res = await fetch(apiUrl(pathname), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function formatWorkedFor(ms) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `思考了${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `思考了${minutes}分${rest}秒` : `思考了${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes ? `思考了${hours}小时${remainMinutes}分` : `思考了${hours}小时`;
}

function formatMessageTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function stampAssistantMeta(messages, startedAt) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'assistant' && !messages[index].pending) {
      messages[index].workedMs = Date.now() - startedAt;
      messages[index].at = new Date().toISOString();
      return;
    }
  }
}

function renderThinking(el) {
  el.className = 'msg assistant pending';
  el.innerHTML =
    '<div class="thinking"><canvas class="thinking-orb" width="22" height="22"></canvas><span class="thinking-label">Thinking<span class="thinking-dots"></span></span></div>';
  const canvas = el.querySelector('canvas');
  if (canvas && window.startThinkingOrb) window.startThinkingOrb(canvas, 22, 'composing');
}

function renderAssistant(el, msg) {
  el.className = 'msg assistant';
  const work = msg.workedMs != null
    ? `<div class="msg-work">${escapeHtml(formatWorkedFor(msg.workedMs))}</div>`
    : '';
  const time = msg.at
    ? `<span class="msg-time">${escapeHtml(formatMessageTime(msg.at))}</span>`
    : '';
  el.innerHTML = `${work}<div class="msg-body">${formatText(msg.text, true)}</div><div class="msg-foot"><button class="msg-copy" type="button" title="复制"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 11c0-2.828 0-4.243.879-5.121C7.757 5 9.172 5 12 5h3c2.828 0 4.243 0 5.121.879C21 6.757 21 8.172 21 11v5c0 2.828 0 4.243-.879 5.121C19.243 22 17.828 22 15 22h-3c-2.828 0-4.243 0-5.121-.879C6 20.243 6 18.828 6 16z" stroke="currentColor" stroke-width="1.5"/><path d="M6 19a3 3 0 0 1-3-3v-6c0-3.771 0-5.657 1.172-6.828S7.229 2 11 2h4a3 3 0 0 1 3 3" stroke="currentColor" stroke-width="1.5"/></svg></button>${time}</div>`;
  const copyBtn = el.querySelector('.msg-copy');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(msg.text || '');
      copyBtn.title = '已复制';
    } catch {
      copyBtn.title = '复制失败';
    }
  });
}

function renderMessages() {
  thread.querySelectorAll('.msg').forEach((node) => node.remove());
  empty.hidden = current.messages.length > 0;
  for (const msg of current.messages) {
    const el = document.createElement('div');
    if (msg.pending && msg.role === 'assistant') {
      renderThinking(el);
    } else if (msg.role === 'assistant') {
      renderAssistant(el, msg);
    } else {
      el.className = 'msg user';
      el.innerHTML = formatText(msg.text, false);
    }
    thread.appendChild(el);
  }
  syncThreadScroll();
}

function isThreadNearBottom() {
  return thread.scrollHeight - thread.scrollTop - thread.clientHeight < 48;
}

function syncThreadScroll() {
  if (stickToBottom) thread.scrollTop = thread.scrollHeight;
  const jumpLatest = document.getElementById('jumpLatest');
  if (jumpLatest) {
    jumpLatest.hidden = stickToBottom || current.messages.length === 0;
  }
}

function updateStreamingText(text) {
  const pending = current.messages.find((msg) => msg.role === 'assistant' && msg.pending);
  if (pending) pending.text = text;
  let el = thread.querySelector('.msg.assistant.streaming');
  if (!el) {
    el = thread.querySelector('.msg.assistant.pending');
    if (!el) return;
    el.className = 'msg assistant streaming';
    el.innerHTML = `<div class="msg-body">${formatText(text, true)}</div>`;
  } else {
    const body = el.querySelector('.msg-body');
    if (body) body.innerHTML = formatText(text, true);
  }
  syncThreadScroll();
}

function renderPickChip() {
  const active = !!(includePick && lastPick?.selector);
  pickBtn.classList.toggle('active', active);
  if (!active) {
    pickLabel.textContent = '选择以编辑';
    clearPickBtn.hidden = true;
    return;
  }
  pickLabel.textContent = [lastPick.tag, lastPick.text || lastPick.selector]
    .filter(Boolean)
    .join(' · ');
  clearPickBtn.hidden = false;
}

function setTitle(title) {
  current.title = title || '新对话';
  chatTitle.textContent = current.title;
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function visibleSessions() {
  const query = (sessionSearch.value || '').trim().toLowerCase();
  if (!query) return sessions;
  return sessions.filter((session) => (session.title || '').toLowerCase().includes(query));
}

function renderSessionList() {
  const items = visibleSessions();
  sessionList.innerHTML = '';
  sessionEmpty.hidden = items.length > 0;
  sessionEmpty.textContent = items.length
    ? ''
    : sessions.length
      ? '没有匹配的会话'
      : currentCwd
        ? `这个目录还没有会话：${folderName(currentCwd)}`
        : '没有找到本地会话';
  for (const session of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'session-row';
    btn.innerHTML = `<span class="t">${escapeHtml(session.title)}</span><span class="row-meta"><span class="when">${escapeHtml(
      formatRelativeTime(session.updatedAt)
    )}</span><span class="row-actions"><button class="row-open" type="button" title="在终端打开"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2c4.714 0 7.071 0 8.535 1.464C22 4.93 22 7.286 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" stroke="currentColor" stroke-width="1.5"></path><path d="M17 15h-5M7 10l.234.195c1.282 1.068 1.923 1.602 1.923 2.305 0 .703-.64 1.237-1.923 2.305L7 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></button><button class="row-delete" type="button" title="删除会话"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M9.17 4a3.001 3.001 0 0 1 5.66 0M20.5 6h-17M18.833 8.5l-.46 6.9c-.177 2.654-.265 3.981-1.13 4.79-.865.81-2.196.81-4.856.81h-.774c-2.66 0-3.991 0-4.856-.81-.865-.809-.954-2.136-1.13-4.79l-.46-6.9M9.5 11l.5 5M14.5 11l-.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></button></span></span>`;
    btn.addEventListener('click', () => {
      menu.hidden = true;
      loadSession(session.id);
    });
    btn.querySelector('.row-open').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openSessionInTerminal(session.id);
    });
    btn.querySelector('.row-delete').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteLocalSession(session);
    });
    sessionList.appendChild(btn);
  }
}

function renderDirectories() {
  dirNow.textContent = currentCwd || '未选择';
  dirList.innerHTML = '';
  for (const directory of directories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dir-item${directory.path === currentCwd ? ' active' : ''}`;
    btn.innerHTML = `<div><div class="n">${escapeHtml(directory.name)}</div><div class="p">${escapeHtml(
      directory.path
    )}</div></div>`;
    btn.addEventListener('click', () => {
      setCurrentCwd(directory.path);
    });
    dirList.appendChild(btn);
  }
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  if (sending) return;
  sendBtn.disabled = !input.value.trim();
  sendBtn.classList.toggle('ready', !sendBtn.disabled);
  sendBtn.setAttribute('title', '发送');
}

async function loadConfig() {
  const data = await chrome.storage.local.get(['port', 'token', 'currentCwd']);
  port = data.port || 3847;
  token = data.token || '';
  currentCwd = data.currentCwd || '';
  lastPick = null;
  includePick = false;
  renderPickChip();
  try {
    const boot = await fetch(apiUrl('/token')).then((r) => r.json());
    token = boot.token || token;
    port = boot.port || port;
    if (token) {
      await chrome.storage.local.set({ token, port });
      chrome.runtime.sendMessage({ type: 'setConfig', port, token }, () => {
        void chrome.runtime.lastError;
      });
    }
  } catch {}
}

async function refreshDirectories() {
  const data = await api('/directories');
  directories = data.directories || [];
  if (!currentCwd && directories[0]?.path) {
    currentCwd = directories[0].path;
    await chrome.storage.local.set({ currentCwd });
  }
  renderDirectories();
}

async function refreshSessions() {
  const query = currentCwd ? `?cwd=${encodeURIComponent(currentCwd)}` : '';
  const data = await api(`/sessions${query}`);
  sessions = data.sessions || [];
  renderSessionList();
}

async function setCurrentCwd(dir) {
  currentCwd = dir;
  await chrome.storage.local.set({ currentCwd });
  renderDirectories();
  if (current.cwd && current.cwd !== currentCwd) newChat();
  else current.cwd = currentCwd;
  try {
    await refreshSessions();
  } catch {}
  moreMenu.hidden = true;
}

async function loadSession(id) {
  const session = await api(`/sessions/${id}`);
  current = {
    id: session.id,
    cwd: session.cwd,
    title: session.title,
    messages: session.messages || [],
  };
  stickToBottom = true;
  setTitle(session.title);
  renderMessages();
}

function newChat() {
  current = { id: null, cwd: currentCwd || null, title: '新对话', messages: [] };
  stickToBottom = true;
  setTitle('新对话');
  renderMessages();
  input.focus();
}

function getPageContext() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'pageContext' }, (page) => {
      void chrome.runtime.lastError;
      resolve(page || {});
    });
  });
}

function setSending(next) {
  sending = next;
  if (sending) {
    sendBtn.disabled = false;
    sendBtn.classList.add('ready', 'stop');
    sendBtn.setAttribute('title', '停止');
    sendBtn.innerHTML = STOP_ICON;
    return;
  }
  sendBtn.classList.remove('stop');
  sendBtn.innerHTML = SEND_ICON;
  resizeInput();
}

function stopMessage() {
  if (activeAbort) activeAbort.abort();
}

async function readSseEvents(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop();
    for (const chunk of chunks) {
      const line = chunk.split('\n').find((entry) => entry.startsWith('data: '));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(6)));
    }
  }
}

async function sendMessage(text) {
  if (sending || !text.trim()) return;
  setSending(true);
  const startedAt = Date.now();
  const abort = new AbortController();
  activeAbort = abort;
  stickToBottom = true;
  current.messages.push({ role: 'user', text });
  current.messages.push({ role: 'assistant', text: '', pending: true });
  empty.hidden = true;
  renderMessages();
  input.value = '';
  resizeInput();
  try {
    const page = await getPageContext();
    const pathname = current.id ? `/sessions/${current.id}/messages` : '/sessions';
    const res = await fetch(apiUrl(pathname), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        text,
        cwd: current.cwd || currentCwd,
        page: { url: page.url || '', title: page.title || '' },
        screenshot: page.screenshot || null,
        pick: includePick && lastPick?.selector ? lastPick : null,
        stream: true,
      }),
      signal: abort.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    let streamed = '';
    let result = {};
    await readSseEvents(res, (event) => {
      if (event.type === 'text') {
        streamed = event.text || `${streamed}${event.data || ''}`;
        updateStreamingText(streamed);
      }
      if (event.type === 'end') result = event;
      if (event.type === 'error') throw new Error(event.message || 'grok error');
    });
    if (result.session) {
      current = {
        id: result.session.id,
        cwd: result.session.cwd,
        title: result.session.title,
        messages: result.session.messages || [],
      };
      stampAssistantMeta(current.messages, startedAt);
      setTitle(current.title);
    } else {
      current.messages = current.messages.filter((msg) => !msg.pending);
      current.messages.push({
        role: 'assistant',
        text: result.text || streamed || (result.stopped ? '已停止' : '(空回复)'),
      });
      stampAssistantMeta(current.messages, startedAt);
      current.id = result.sessionId || current.id;
    }
    await refreshSessions();
  } catch (err) {
    if (err.name === 'AbortError') {
      const pending = current.messages.find((msg) => msg.role === 'assistant' && msg.pending);
      if (pending) {
        pending.pending = false;
        pending.text = pending.text || '已停止';
        stampAssistantMeta(current.messages, startedAt);
      }
    } else {
      current.messages = current.messages.filter((msg) => !msg.pending);
      current.messages.push({ role: 'assistant', text: `发送失败：${err.message}` });
      stampAssistantMeta(current.messages, startedAt);
    }
  } finally {
    activeAbort = null;
    setSending(false);
    renderMessages();
  }
}

function closeMenus() {
  menu.hidden = true;
  moreMenu.hidden = true;
}

function syncMoreMenu() {
  renderDirectories();
  dirInput.value = currentCwd || '';
}

async function openSessionInTerminal(sessionId) {
  if (!sessionId) return;
  try {
    await api(`/sessions/${sessionId}/open`, { method: 'POST', body: '{}' });
  } catch {}
}

async function deleteLocalSession(session) {
  const title = session.title || '这条会话';
  if (!window.confirm(`删除「${title}」？本地文件会一起删掉，无法恢复。`)) return;
  try {
    await api(`/sessions/${session.id}`, { method: 'DELETE' });
    if (current.id === session.id) newChat();
    await refreshSessions();
  } catch {}
}

menuBtn.addEventListener('click', async (event) => {
  event.stopPropagation();
  moreMenu.hidden = true;
  menu.hidden = !menu.hidden;
  if (menu.hidden) return;
  sessionSearch.value = '';
  sessionSearch.focus();
  try {
    await refreshSessions();
  } catch (err) {
    sessions = [];
    renderSessionList();
    sessionEmpty.hidden = false;
    sessionEmpty.textContent =
      err.message === 'not found'
        ? '本机服务还是旧版本，请重启 server 后再拉会话'
        : err.message;
  }
});

sessionSearch.addEventListener('input', renderSessionList);
sessionSearch.addEventListener('click', (event) => event.stopPropagation());

document.getElementById('newChatBtn').addEventListener('click', () => {
  closeMenus();
  newChat();
});

pickBtn.addEventListener('click', (event) => {
  if (event.target === clearPickBtn) return;
  chrome.runtime.sendMessage({ type: 'startPick' }, () => {
    void chrome.runtime.lastError;
  });
});

clearPickBtn.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  includePick = false;
  lastPick = null;
  renderPickChip();
});

async function refreshBridgeSwitch() {
  const ok = await checkBridge();
  bridgeSwitch.setAttribute('aria-checked', ok ? 'true' : 'false');
  bridgeState.textContent = ok ? `已开启 · 127.0.0.1:${port}` : '已停止。终端再跑一次安装命令即可启动';
}

moreBtn.addEventListener('click', async (event) => {
  event.stopPropagation();
  menu.hidden = true;
  const opening = moreMenu.hidden;
  moreMenu.hidden = !opening;
  if (!opening) return;
  syncMoreMenu();
  refreshBridgeSwitch();
  try {
    await refreshDirectories();
    syncMoreMenu();
  } catch {}
});

bridgeSwitch.addEventListener('click', async (event) => {
  event.stopPropagation();
  const on = bridgeSwitch.getAttribute('aria-checked') === 'true';
  if (!on) {
    bridgeState.textContent = '扩展无法直接拉起本机服务。终端再跑一次安装命令即可启动';
    return;
  }
  try {
    await api('/shutdown', { method: 'POST', body: '{}' });
  } catch {}
  for (let i = 0; i < 12; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (!(await checkBridge())) break;
  }
  if (await checkBridge()) {
    bridgeSwitch.setAttribute('aria-checked', 'true');
    bridgeState.textContent = '开机项把它又拉起来了。再跑一次安装命令后，开关就能停住';
    return;
  }
  await refreshBridgeSwitch();
});

dirForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const raw = dirInput.value.trim();
  if (!raw) return;
  try {
    const resolved = await api('/directories/resolve', {
      method: 'POST',
      body: JSON.stringify({ path: raw }),
    });
    await setCurrentCwd(resolved.path);
  } catch {}
});

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  if (sending) stopMessage();
  else sendMessage(input.value.trim());
});

thread.addEventListener('scroll', () => {
  stickToBottom = isThreadNearBottom();
  syncThreadScroll();
});

document.getElementById('jumpLatest').addEventListener('click', () => {
  stickToBottom = true;
  thread.scrollTop = thread.scrollHeight;
  syncThreadScroll();
});


input.addEventListener('input', resizeInput);
input.addEventListener('compositionend', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage(input.value.trim());
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' && event.code !== 'Escape') return;
  chrome.runtime.sendMessage({ type: 'cancelPick' }, () => {
    void chrome.runtime.lastError;
  });
});

document.addEventListener('click', (event) => {
  if (!menu.hidden && !menu.contains(event.target) && !menuBtn.contains(event.target)) {
    menu.hidden = true;
  }
  if (!moreMenu.hidden && !moreMenu.contains(event.target) && !moreBtn.contains(event.target)) {
    moreMenu.hidden = true;
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'lastPick') {
    lastPick = msg.pick;
    includePick = true;
    renderPickChip();
  }
});

async function checkBridge() {
  try {
    const res = await fetch(apiUrl('/health'), { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

function setSetupVisible(on) {
  document.body.classList.toggle('setup-on', on);
  document.getElementById('setup').hidden = !on;
}

async function connectApp() {
  await loadConfig();
  if (!token) return;
  try {
    await refreshDirectories();
    await refreshSessions();
  } catch {}
  if (currentCwd && !current.cwd) current.cwd = currentCwd;
  resizeInput();
}

document.getElementById('copyInstall').addEventListener('click', async () => {
  const cmd = document.getElementById('installCmd').textContent;
  try {
    await navigator.clipboard.writeText(cmd);
    document.getElementById('setupHint').textContent = '已复制，去终端粘贴运行';
  } catch {
    document.getElementById('setupHint').textContent = '复制失败，请手动选中命令';
  }
});

(async function init() {
  if (await checkBridge()) {
    setSetupVisible(false);
    await connectApp();
    return;
  }
  setSetupVisible(true);
  const hint = document.getElementById('setupHint');
  const timer = setInterval(async () => {
    if (!(await checkBridge())) return;
    clearInterval(timer);
    hint.textContent = '已连上本机服务';
    setSetupVisible(false);
    await connectApp();
  }, 2000);
})();
