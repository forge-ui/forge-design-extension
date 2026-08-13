import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function grokHome() {
  return process.env.GROK_HOME || path.join(os.homedir(), '.grok');
}

export function resolveGrokBin() {
  if (process.env.GROK_BIN) return process.env.GROK_BIN;
  const local = path.join(grokHome(), 'bin', 'grok');
  if (fs.existsSync(local)) return local;
  return 'grok';
}

function flattenContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        if (part && part.type === 'image') return '[图片]';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof content === 'object' && typeof content.text === 'string') return content.text;
  return '';
}

export function extractUserText(content) {
  const raw = flattenContent(content).trim();
  if (!raw) return '';
  const query = raw.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/);
  if (query) return query[1].trim();
  if (/<(user_info|system-reminder|image_files|environment_context|mcp_|skill)\b/i.test(raw)) {
    return '';
  }
  const stripped = raw
    .replace(/<user_info>[\s\S]*?<\/user_info>/g, '')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<image_files>[\s\S]*?<\/image_files>/g, '')
    .trim();
  return stripped;
}

export function normalizeCwd(dir) {
  if (!dir) return '';
  return path.resolve(String(dir));
}

export function resolveDirectory(raw) {
  let dir = String(raw || '').trim();
  if (!dir) return { exists: false, path: '', name: '' };
  if (dir.startsWith('~')) dir = path.join(os.homedir(), dir.slice(1));
  dir = path.resolve(dir);
  let exists = false;
  try {
    exists = fs.statSync(dir).isDirectory();
  } catch {}
  return {
    path: dir,
    name: path.basename(dir) || dir,
    exists,
  };
}

export function listDirectories() {
  const sessions = listSessions({ limit: 500 });
  const map = new Map();
  for (const session of sessions) {
    if (!session.cwd) continue;
    const key = normalizeCwd(session.cwd);
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        path: key,
        name: path.basename(key) || key,
        count: 1,
        updatedAt: session.updatedAt,
      });
      continue;
    }
    current.count += 1;
    if (String(session.updatedAt || '') > String(current.updatedAt || '')) {
      current.updatedAt = session.updatedAt;
    }
  }
  return [...map.values()].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export function listSessions({ limit = 40, cwd } = {}) {
  const root = path.join(grokHome(), 'sessions');
  let items = [];
  if (!fs.existsSync(root)) return items;

  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const summaryPath = path.join(dir, 'summary.json');
    if (fs.existsSync(summaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        if (summary.session_kind === 'subagent') continue;
        const info = summary.info || {};
        items.push({
          id: info.id || path.basename(dir),
          title:
            summary.session_summary ||
            summary.generated_title ||
            summary.last_turn_summary ||
            'Untitled',
          cwd: info.cwd || null,
          model: summary.current_model_id || null,
          updatedAt: summary.last_active_at || summary.updated_at || null,
          createdAt: summary.created_at || null,
          lastTurn: summary.last_turn_summary || null,
          messages: summary.num_chat_messages || summary.num_messages || 0,
        });
      } catch {}
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        stack.push(path.join(dir, entry.name));
      }
    }
  }

  items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  if (cwd) {
    const wanted = normalizeCwd(cwd);
    items = items.filter((item) => item.cwd && normalizeCwd(item.cwd) === wanted);
  }
  return items.slice(0, limit);
}

export function findSessionDir(sessionId) {
  if (!UUID_RE.test(sessionId)) return null;
  const root = path.join(grokHome(), 'sessions');
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    if (path.basename(dir) === sessionId && fs.existsSync(path.join(dir, 'summary.json'))) {
      return dir;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        stack.push(path.join(dir, entry.name));
      }
    }
  }
  return null;
}

export function deleteSession(sessionId) {
  const dir = findSessionDir(sessionId);
  if (!dir) return { ok: false, error: 'session not found' };
  const root = path.resolve(path.join(grokHome(), 'sessions'));
  const resolved = path.resolve(dir);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved === root || !resolved.startsWith(prefix)) {
    return { ok: false, error: 'invalid session path' };
  }
  fs.rmSync(resolved, { recursive: true, force: true });
  return { ok: true, id: sessionId };
}

function readTurnMetas(dir) {
  const eventsPath = path.join(dir, 'events.jsonl');
  if (!fs.existsSync(eventsPath)) return [];
  const turns = [];
  let startedAt = null;
  const lines = fs.readFileSync(eventsPath, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.includes('"turn_')) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row.type === 'turn_started') {
      startedAt = row.ts || null;
      continue;
    }
    if (row.type !== 'turn_ended') continue;
    const start = Date.parse(startedAt || '');
    const end = Date.parse(row.ts || '');
    turns.push({
      at: row.ts || startedAt || null,
      workedMs: Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : null,
    });
    startedAt = null;
  }
  return turns;
}

function attachTurnMetas(messages, turns, fallbackAt) {
  const streaks = [];
  let streak = [];
  const flush = () => {
    if (streak.length) streaks.push(streak);
    streak = [];
  };
  for (const message of messages) {
    if (message.role === 'assistant') {
      streak.push(message);
    } else {
      flush();
    }
  }
  flush();

  if (turns.length) {
    const count = Math.min(streaks.length, turns.length);
    for (let offset = 1; offset <= count; offset += 1) {
      const group = streaks[streaks.length - offset];
      const turn = turns[turns.length - offset];
      for (const message of group) {
        if (turn.at) message.at = turn.at;
      }
      if (turn.workedMs != null) group[group.length - 1].workedMs = turn.workedMs;
    }
  }

  let lastAt = null;
  for (const message of messages) {
    if (message.at) lastAt = message.at;
    else if (lastAt) message.at = lastAt;
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].at) lastAt = messages[index].at;
    else if (lastAt) messages[index].at = lastAt;
  }
  if (fallbackAt) {
    for (const message of messages) {
      if (!message.at) message.at = fallbackAt;
    }
  }
}

export function readSession(sessionId, { messageLimit = 80 } = {}) {
  const dir = findSessionDir(sessionId);
  if (!dir) return null;
  const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  const historyPath = path.join(dir, 'chat_history.jsonl');
  const messages = [];
  if (fs.existsSync(historyPath)) {
    const lines = fs.readFileSync(historyPath, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      if (row.type !== 'user' && row.type !== 'assistant') continue;
      const text =
        row.type === 'user' ? extractUserText(row.content) : flattenContent(row.content);
      if (!text && row.type === 'assistant' && row.tool_calls) continue;
      if (!text) continue;
      messages.push({
        role: row.type,
        text: text.slice(0, 8000),
      });
    }
  }
  const visible = messages.slice(-messageLimit);
  const updatedAt = summary.last_active_at || summary.updated_at || summary.created_at || null;
  attachTurnMetas(visible, readTurnMetas(dir), updatedAt);
  const info = summary.info || {};
  return {
    id: info.id || sessionId,
    title: summary.session_summary || summary.generated_title || 'Untitled',
    cwd: info.cwd || null,
    model: summary.current_model_id || null,
    updatedAt,
    messages: visible,
  };
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function osascriptQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function grokArgs({ prompt, sessionId, cwd, stream }) {
  const args = ['-p', prompt, '--always-approve'];
  args.push('--output-format', stream ? 'streaming-json' : 'json');
  if (sessionId) args.push('--resume', sessionId);
  if (cwd) args.push('--cwd', cwd);
  return args;
}

export function runGrok({ prompt, sessionId, cwd, timeoutMs = 600000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveGrokBin(), grokArgs({ prompt, sessionId, cwd, stream: false }), {
      cwd: cwd || os.homedir(),
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('grok timed out'));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error((stderr || stdout || `grok exited ${code}`).slice(-800)));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ text: stdout.trim(), sessionId: sessionId || null });
      }
    });
  });
}

export function startGrokStream({ prompt, sessionId, cwd, timeoutMs = 600000, onEvent }) {
  const child = spawn(resolveGrokBin(), grokArgs({ prompt, sessionId, cwd, stream: true }), {
    cwd: cwd || os.homedir(),
    env: process.env,
  });
  let buffer = '';
  let stderr = '';
  let text = '';
  let finalSessionId = sessionId || null;
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
  }, timeoutMs);

  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf('\n');
      if (!line) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (event.type === 'text' && event.data) {
        text += event.data;
        onEvent?.({ type: 'text', data: event.data, text });
      }
      if (event.type === 'end') {
        finalSessionId = event.sessionId || event.session_id || finalSessionId;
        if (event.text) text = event.text;
      }
      if (event.type === 'error') {
        onEvent?.({ type: 'error', message: event.message || 'grok error' });
      }
    }
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const done = new Promise((resolve, reject) => {
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ text, sessionId: finalSessionId, stopped: false });
        return;
      }
      if (signal === 'SIGTERM' || signal === 'SIGKILL' || code === 130 || code === 143) {
        resolve({ text, sessionId: finalSessionId, stopped: true });
        return;
      }
      reject(new Error((stderr || `grok exited ${code}`).slice(-800)));
    });
  });

  return { child, done };
}

export function writeScreenshotFile(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpg' : 'png';
  const dir = path.join(os.tmpdir(), 'forge-design-shots');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${cryptoRandom()}.${ext}`);
  fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
  setTimeout(() => {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }, 10 * 60 * 1000);
  return filePath;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 8);
}

export function buildGrokPrompt({ text, page, screenshotPath, pick, place, places }) {
  const parts = [];
  if (page?.url) {
    parts.push('用户当前正在看这个 Chrome 页面：');
    parts.push(`url: ${page.url}`);
    if (page.title) parts.push(`title: ${page.title}`);
  }
  if (screenshotPath) {
    parts.push(`viewport screenshot: ${screenshotPath}`);
    parts.push('请先用 read_file 打开这张截图，再根据页面实际情况回答。');
  }
  const batch = Array.isArray(places) && places.length
    ? places
    : Array.isArray(place?.places) && place.places.length
      ? place.places
      : place?.component
        ? [place]
        : [];
  if (batch.length) {
    const describe = (item, index) => {
      const component = item.component || {};
      const exports = [component.exportName, ...(component.extras || [])].filter(Boolean);
      const allowed = { before: 'before', after: 'after', inside: 'inside', left: 'left', right: 'right' };
      const position = allowed[item.position] || 'after';
      const n = item.index || index + 1;
      const lines = [
        `#${n}`,
        `component: ${component.name || ''}`,
        `id: ${component.id || ''}`,
        `import from: @forge-ui-official/core`,
        `exports: ${exports.join(', ') || component.name || ''}`,
      ];
      if (component.variant && component.variant !== 'default') {
        lines.push(`variant: ${component.variant}`);
      }
      if (component.variantHint) {
        lines.push(`props hint: ${component.variantHint}`);
      }
      lines.push(`position: ${position}`);
      if (item.relativeToIndex) {
        lines.push(`relative to: #${item.relativeToIndex}`);
        lines.push(item.position === 'inside'
          ? 'anchor: nest inside that placement'
          : 'anchor: previous placement, not a new page region');
      } else if (item.pick?.selector) {
        lines.push(`anchor selector: ${item.pick.selector}`);
        lines.push(`anchor tag: ${item.pick.tag || ''}`);
        lines.push(`anchor text: ${item.pick.text || ''}`);
        lines.push(`anchor testid: ${item.pick.testid || ''}`);
      }
      if (item.rect && (item.rect.w || item.rect.h)) {
        lines.push(`preview rect: ${item.rect.x},${item.rect.y} ${item.rect.w}x${item.rect.h}`);
      }
      if (item.slot && (item.slot.row >= 0 || item.slot.col >= 0 || item.slot.text)) {
        lines.push(`inside slot: row ${item.slot.row} col ${item.slot.col} text ${item.slot.text || ''} tag ${item.slot.tag || ''}`);
      }
      return lines.join('\n');
    };
    if (batch.length > 1) {
      parts.push('用户要把多个 Forge 组件一次性写进当前页面。编号与页面上的预览块一致。必须在这一轮把全部组件都写入源码，不要只写第一个。');
    } else {
      parts.push('用户要把一个 Forge 组件放到当前页面上：');
    }
    parts.push(...batch.map((item, index) => describe(item, index)));
    const composition = batch.map((item, index) => {
      const n = item.index || index + 1;
      const name = item.component?.name || item.component?.exportName || 'Forge';
      if (item.relativeToIndex && item.position === 'inside') {
        return `#${n} ${name} 叠在 #${item.relativeToIndex} 内部`;
      }
      if (item.relativeToIndex) {
        return `#${n} ${name} 在 #${item.relativeToIndex} 的 ${item.position || 'after'}`;
      }
      return `#${n} ${name} 在锚点 ${item.pick?.selector || ''} 的 ${item.position || 'after'}`;
    });
    parts.push('版式（必须按这个相对关系还原，不要擅自改成一列）：');
    parts.push(composition.join('\n'));
    parts.push('页面上刚插入的 Forge 复刻块是插件 overlay，不是源码。用户点「写入源码」之后才要改文件。');
    parts.push('如果 position 是 left 或 right，写成同一行的左/右兄弟（flex row）。before / after 是上方 / 下方。');
    parts.push('如果 position 是 inside，这一块是叠在宿主内部的内容，不要写成宿主旁边的兄弟。DataTable / FullWidthTable 上的 CellText 或其它组件，写进对应单元格 / columns.render，而不是表格下面另起一块。');
    parts.push('如果 relative to 指向另一块预览，这一块要贴着那一块写，而不是再去找一个新的页面区域。');
    parts.push('如果当前 cwd 是本地 Forge / Next 应用，在对应页面源码写入真实 import 与 JSX，不要只改 DOM。');
    parts.push('如果当前页不是这个仓库跑起来的页面，不要假装已经插入；说明无法写入当前页，并指出应改哪个本地文件。');
    parts.push('不要手搓等价 UI。只用 @forge-ui-official/core 导出的组件。');
  } else if (pick?.selector) {
    parts.push('用户选中了这个元素，请把它当作这次要改、要看的目标：');
    parts.push(`selector: ${pick.selector}`);
    parts.push(`tag: ${pick.tag || ''}`);
    parts.push(`text: ${pick.text || ''}`);
    parts.push(`testid: ${pick.testid || ''}`);
  }
  if (parts.length) parts.push('');
  parts.push(text);
  return parts.join('\n');
}

export function openSessionInTerminal({ sessionId, cwd }) {
  if (!sessionId) return Promise.reject(new Error('sessionId required'));
  const workdir = cwd || os.homedir();
  const script = `cd ${shellSingleQuote(workdir)} && exec ${shellSingleQuote(resolveGrokBin())} --resume ${shellSingleQuote(sessionId)}`;
  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', `tell application "Terminal" to do script ${osascriptQuote(script)}`]);
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `osascript exited ${code}`));
      else resolve({ ok: true, sessionId, cwd: workdir });
    });
  });
}
