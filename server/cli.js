#!/usr/bin/env node
/**
 * CLI for the Forge Design local bridge
 *
 * Usage:
 *   node cli.js status
 *   node cli.js goto http://localhost:3000
 *   node cli.js snapshot
 *   node cli.js click "button[data-testid=save]"
 *   node cli.js fill "input[name=title]" "hello"
 *   node cli.js type "hello world"
 *   node cli.js press Enter
 *   node cli.js text
 *   node cli.js tabs
 *   node cli.js raw '{"command":"snapshot","args":{"limit":30}}'
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, '.bridge-state.json');
const PORT = Number(process.env.BRIDGE_PORT || 3847);
const HOST = process.env.BRIDGE_HOST || '127.0.0.1';

function loadToken() {
  if (process.env.BRIDGE_TOKEN) return process.env.BRIDGE_TOKEN;
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')).token;
  } catch {
    throw new Error('No token. Start server first (npm start).');
  }
}

async function request(pathname, { method = 'GET', body } = {}) {
  const token = loadToken();
  const res = await fetch(`http://${HOST}:${PORT}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

function usage() {
  console.log(`forge-design CLI

Commands:
  status
  health
  tabs
  url
  goto <url>
  newtab [url]
  activate <tabId>
  reload
  text
  snapshot [limit]
  click <selector>
  fill <selector> <text...>
  type <text...>
  press <key>
  wait <selector>
  exists <selector>
  scroll [y]
  eval <expression>
  last-pick
  start-pick
  last-place
  start-place
  raw <json>

Examples:
  node cli.js goto https://x.com/home
  node cli.js snapshot
  node cli.js fill 'div[role=textbox]' 'hello'
`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '-h' || cmd === '--help') {
    usage();
    process.exit(0);
  }

  if (cmd === 'health') {
    const res = await fetch(`http://${HOST}:${PORT}/health`);
    console.log(JSON.stringify(await res.json(), null, 2));
    return;
  }

  let command = cmd;
  let args = {};

  switch (cmd) {
    case 'status':
    case 'tabs':
    case 'url':
    case 'title':
    case 'reload':
    case 'text':
      break;
    case 'snapshot':
      args = { limit: Number(rest[0] || 80) };
      break;
    case 'goto':
      args = { url: rest[0] };
      if (!args.url) throw new Error('url required');
      break;
    case 'newtab':
      args = { url: rest[0] };
      break;
    case 'activate':
      args = { tabId: Number(rest[0]) };
      break;
    case 'click':
    case 'wait':
    case 'exists':
    case 'focus':
      args = { selector: rest[0] };
      if (!args.selector) throw new Error('selector required');
      break;
    case 'fill':
      args = { selector: rest[0], text: rest.slice(1).join(' ') };
      if (!args.selector) throw new Error('selector required');
      break;
    case 'type':
      args = { text: rest.join(' ') };
      break;
    case 'press':
      args = { key: rest[0] || 'Enter' };
      break;
    case 'scroll':
      args = { y: Number(rest[0] || 600) };
      break;
    case 'eval':
      args = { expression: rest.join(' ') };
      break;
    case 'last-pick':
    case 'lastPick':
      command = 'last-pick';
      break;
    case 'start-pick':
    case 'startPick':
      command = 'start-pick';
      break;
    case 'last-place':
    case 'lastPlace':
      command = 'last-place';
      break;
    case 'start-place':
    case 'startPlace':
      command = 'start-place';
      args = rest[0] ? { component: { name: rest.join(' ') } } : {};
      break;
    case 'raw': {
      const payload = JSON.parse(rest.join(' ') || '{}');
      command = payload.command || payload.cmd;
      args = payload.args || {};
      break;
    }
    default:
      // allow: node cli.js command -- as generic
      args = rest[0] ? JSON.parse(rest.join(' ')) : {};
      break;
  }

  const result = await request('/command', {
    method: 'POST',
    body: { command, args },
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.data ? JSON.stringify(err.data, null, 2) : err.message);
  process.exit(1);
});
