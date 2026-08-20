import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  collectExtensionDirs,
  copyDir,
  extensionDirsFromPrefs,
  extractZip,
  fetchLatestRelease,
  findGitRoot,
  isInside,
  readExtensionVersion,
  updateExtensionDir,
} from './update.js';

function makeTemp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('isInside rejects paths that escape the dest', () => {
  const root = '/tmp/forge-ext';
  assert.equal(isInside(root, path.join(root, 'manifest.json')), true);
  assert.equal(isInside(root, path.join(root, 'vendor', 'x.js')), true);
  assert.equal(isInside(root, path.join(root, '..', 'secret')), false);
});

test('findGitRoot walks up from extension/', () => {
  const root = makeTemp('forge-git-');
  try {
    execFileSync('git', ['init'], { cwd: root });
    const ext = path.join(root, 'extension');
    fs.mkdirSync(ext);
    assert.equal(findGitRoot(ext), root);
    assert.equal(findGitRoot(root), root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('extensionDirsFromPrefs only keeps Forge Design unpacked paths', () => {
  const dir = makeTemp('forge-pref-');
  try {
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ version: '0.3.32' }));
    const dirs = extensionDirsFromPrefs({
      extensions: {
        settings: {
          aaa: { manifest: { name: 'Forge Design' }, path: dir },
          bbb: { manifest: { name: 'Other' }, path: dir },
          ccc: { manifest: { name: 'Forge Design' }, path: '/missing/ext' },
        },
      },
    });
    assert.deepEqual(dirs, [path.resolve(dir)]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('collectExtensionDirs merges prefs and extra dirs', () => {
  const extra = makeTemp('forge-extra-');
  try {
    fs.writeFileSync(path.join(extra, 'manifest.json'), '{"version":"1"}');
    const dirs = collectExtensionDirs({ extraDirs: [extra], prefsFiles: [] });
    assert.deepEqual(dirs, [path.resolve(extra)]);
  } finally {
    fs.rmSync(extra, { recursive: true, force: true });
  }
});

test('copyDir writes files and skips .git', () => {
  const src = makeTemp('forge-src-');
  const dest = makeTemp('forge-dst-');
  try {
    fs.writeFileSync(path.join(src, 'manifest.json'), '{"version":"9.9.9"}');
    fs.mkdirSync(path.join(src, '.git'));
    fs.writeFileSync(path.join(src, '.git', 'HEAD'), 'ref');
    copyDir(src, dest);
    assert.equal(readExtensionVersion(dest), '9.9.9');
    assert.equal(fs.existsSync(path.join(dest, '.git')), false);
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});

test('extractZip copies a packaged extension zip', async () => {
  const src = makeTemp('forge-zip-src-');
  const dest = makeTemp('forge-zip-dst-');
  const zip = path.join(os.tmpdir(), `forge-pack-${Date.now()}.zip`);
  try {
    fs.writeFileSync(path.join(src, 'manifest.json'), '{"version":"0.9.0"}');
    execFileSync('zip', ['-q', zip, 'manifest.json'], { cwd: src });
    await extractZip(zip, dest);
    assert.equal(readExtensionVersion(dest), '0.9.0');
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.rmSync(zip, { force: true });
  }
});

test('updateExtensionDir skips a dirty git checkout', async () => {
  const root = makeTemp('forge-dirty-');
  try {
    execFileSync('git', ['init'], { cwd: root });
    execFileSync('git', ['-C', root, 'config', 'user.email', 'dev@example.com']);
    execFileSync('git', ['-C', root, 'config', 'user.name', 'Dev']);
    const ext = path.join(root, 'extension');
    fs.mkdirSync(ext);
    fs.writeFileSync(path.join(ext, 'manifest.json'), '{"version":"0.1.0"}');
    execFileSync('git', ['-C', root, 'add', '.']);
    execFileSync('git', ['-C', root, 'commit', '-m', 'init']);
    fs.writeFileSync(path.join(ext, 'manifest.json'), '{"version":"0.1.1"}');
    const result = await updateExtensionDir(ext, { zipPath: '/tmp/no.zip' });
    assert.equal(result.updated, false);
    assert.equal(result.skipped, 'dirty');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fetchLatestRelease reads tag and zip asset', async () => {
  const release = await fetchLatestRelease(async () => ({
    ok: true,
    json: async () => ({
      tag_name: 'v0.3.40',
      assets: [
        {
          name: 'forge-design-extension-v0.3.40.zip',
          browser_download_url: 'https://example.test/ext.zip',
        },
      ],
    }),
  }));
  assert.equal(release.version, '0.3.40');
  assert.equal(release.zipUrl, 'https://example.test/ext.zip');
});
