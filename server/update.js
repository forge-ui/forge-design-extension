import { execFile as execFileCb } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

export const RELEASES_API =
  'https://api.github.com/repos/forge-ui/forge-design-extension/releases/latest';

export function readExtensionVersion(dir) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    return typeof manifest.version === 'string' ? manifest.version : null;
  } catch {
    return null;
  }
}

export function findGitRoot(dir) {
  let current = path.resolve(dir);
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export function isInside(parent, child) {
  const root = path.resolve(parent);
  const target = path.resolve(child);
  return target === root || target.startsWith(`${root}${path.sep}`);
}

export function listChromePreferenceFiles(home = os.homedir()) {
  const roots = [
    path.join(home, 'Library/Application Support/Google/Chrome'),
    path.join(home, 'Library/Application Support/Google/Chrome Canary'),
    path.join(home, 'Library/Application Support/Chromium'),
    path.join(home, 'Library/Application Support/Microsoft Edge'),
  ];
  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const prefs = path.join(root, entry.name, 'Secure Preferences');
      if (fs.existsSync(prefs)) files.push(prefs);
    }
  }
  return files;
}

export function extensionDirsFromPrefs(prefsJson) {
  const settings = prefsJson?.extensions?.settings || {};
  const dirs = [];
  for (const info of Object.values(settings)) {
    const name = info?.manifest?.name;
    const dir = info?.path;
    if (name !== 'Forge Design' || !dir || !path.isAbsolute(dir)) continue;
    if (fs.existsSync(path.join(dir, 'manifest.json'))) dirs.push(path.resolve(dir));
  }
  return dirs;
}

export function collectExtensionDirs({ extraDirs = [], prefsFiles = [] } = {}) {
  const dirs = new Set();
  for (const dir of extraDirs) {
    if (dir && fs.existsSync(path.join(dir, 'manifest.json'))) dirs.add(path.resolve(dir));
  }
  for (const file of prefsFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const dir of extensionDirsFromPrefs(data)) dirs.add(dir);
    } catch {}
  }
  return [...dirs];
}

export async function gitStatusPorcelain(repo) {
  const { stdout } = await execFile('git', ['-C', repo, 'status', '--porcelain']);
  return stdout.trim();
}

export async function gitPull(repo) {
  await execFile('git', ['-C', repo, 'pull', '--ff-only']);
}

export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (name === '.DS_Store' || name === '.git') continue;
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (!isInside(dest, to)) throw new Error(`unsafe extract path: ${name}`);
    const stat = fs.statSync(from);
    if (stat.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

export async function extractZip(zipPath, dest) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-ext-'));
  try {
    await execFile('unzip', ['-o', zipPath, '-d', tmp]);
    if (!fs.existsSync(path.join(tmp, 'manifest.json'))) {
      throw new Error('zip is missing manifest.json');
    }
    copyDir(tmp, dest);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function fetchLatestRelease(fetcher = fetch) {
  const res = await fetcher(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'forge-design-bridge' },
  });
  if (!res.ok) throw new Error(`GitHub release ${res.status}`);
  const data = await res.json();
  const version = String(data.tag_name || '').replace(/^v/, '');
  const asset = (data.assets || []).find((item) =>
    /^forge-design-extension-v.+\.zip$/.test(item.name || '')
  );
  if (!version || !asset?.browser_download_url) {
    throw new Error('latest release has no extension zip');
  }
  return { version, zipUrl: asset.browser_download_url, name: asset.name };
}

export async function downloadFile(url, dest, fetcher = fetch) {
  const res = await fetcher(url, { headers: { 'User-Agent': 'forge-design-bridge' } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

export async function updateExtensionDir(dir, { zipPath }) {
  const repo = findGitRoot(dir);
  if (repo) {
    const dirty = await gitStatusPorcelain(repo);
    if (dirty) {
      return { path: dir, updated: false, skipped: 'dirty', version: readExtensionVersion(dir) };
    }
    await gitPull(repo);
    return { path: dir, updated: true, method: 'git', version: readExtensionVersion(dir) };
  }
  if (!zipPath) throw new Error('zip required');
  await extractZip(zipPath, dir);
  return { path: dir, updated: true, method: 'zip', version: readExtensionVersion(dir) };
}

export async function updateInstalledExtension({
  rootExtensionDir,
  home = os.homedir(),
  fetcher = fetch,
} = {}) {
  const dirs = collectExtensionDirs({
    extraDirs: [rootExtensionDir],
    prefsFiles: listChromePreferenceFiles(home),
  });
  if (!dirs.length) throw new Error('no Forge Design extension folder found');

  const release = await fetchLatestRelease(fetcher);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-rel-'));
  const zipPath = path.join(tmpDir, release.name);
  const results = [];
  try {
    const needsZip = dirs.some((dir) => !findGitRoot(dir));
    if (needsZip) await downloadFile(release.zipUrl, zipPath, fetcher);
    for (const dir of dirs) {
      results.push(await updateExtensionDir(dir, { zipPath }));
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const updated = results.filter((item) => item.updated);
  if (!updated.length) {
    const dirty = results.every((item) => item.skipped === 'dirty');
    throw new Error(dirty ? '工作区有未提交改动，无法自动更新' : '没有可更新的插件目录');
  }
  return {
    ok: true,
    version: release.version,
    results,
  };
}
