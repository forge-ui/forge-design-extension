import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, '../extension/vendor');
mkdirSync(outDir, { recursive: true });

const css = spawnSync(
  'npx',
  ['@tailwindcss/cli', '-i', 'src/input.css', '-o', resolve(outDir, 'forge-kit.css'), '--minify'],
  { cwd: root, stdio: 'inherit' },
);
if (css.status !== 0) process.exit(css.status || 1);

const cssPath = resolve(outDir, 'forge-kit.css');
writeFileSync(
  cssPath,
  readFileSync(cssPath, 'utf8')
    .replaceAll(':root{', ':host,:root{')
    .replaceAll(':root,', ':host,:root,'),
);

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/mount.jsx'],
  outfile: resolve(outDir, 'forge-palette.js'),
  bundle: true,
  format: 'iife',
  globalName: 'ForgePalette',
  jsx: 'automatic',
  minify: true,
  alias: {
    'next/navigation': resolve(root, 'src/next-stubs.js'),
    'next/link': resolve(root, 'src/next-stubs.js'),
    react: resolve(root, 'node_modules/react'),
    'react-dom': resolve(root, 'node_modules/react-dom'),
  },
  logLevel: 'info',
});
