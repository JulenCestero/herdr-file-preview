#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { openPreview } = require('./open-pane.js');

function readClipboard() {
  const platform = process.platform;
  if (platform === 'win32') {
    const r = spawnSync('powershell', ['-NoProfile', '-Command', 'Get-Clipboard -Raw'], { encoding: 'utf8' });
    return r.status === 0 ? r.stdout : '';
  }
  if (platform === 'darwin') {
    const r = spawnSync('pbpaste', [], { encoding: 'utf8' });
    return r.status === 0 ? r.stdout : '';
  }
  // Linux: try Wayland, then X11 clipboard tools, whichever is installed.
  for (const [cmd, args] of [
    ['wl-paste', []],
    ['xclip', ['-selection', 'clipboard', '-o']],
    ['xsel', ['--clipboard', '--output']],
  ]) {
    const r = spawnSync(cmd, args, { encoding: 'utf8' });
    if (!r.error && r.status === 0) return r.stdout;
  }
  return '';
}

// Herdr's own copy-mode / double-click selection already picks out a
// whole path-shaped token; this just strips whatever wrapping punctuation
// prose tends to leave around one (quotes, backticks, trailing periods).
function cleanPath(text) {
  return text
    .trim()
    .replace(/^[`'"<(\[{]+/, '')
    .replace(/[`'">)\]}.,;:]+$/, '');
}

function resolveAgainstPaneCwd(filePath) {
  const herdrBin = process.env.HERDR_BIN_PATH || 'herdr';
  const paneId = process.env.HERDR_PANE_ID || '';
  if (!paneId) return filePath;

  const r = spawnSync(herdrBin, ['pane', 'get', paneId], { encoding: 'utf8' });
  if (r.status !== 0) return filePath;

  try {
    const pane = JSON.parse(r.stdout)?.result?.pane;
    const cwd = pane?.foreground_cwd || pane?.cwd;
    if (cwd) return path.resolve(cwd, filePath);
  } catch {
    // couldn't read pane cwd — fall through and use the path as typed
  }
  return filePath;
}

const clipboardText = cleanPath(readClipboard());

if (!clipboardText) {
  console.error('clipboard is empty or unreadable');
  process.exit(0);
}

const filePath = path.isAbsolute(clipboardText)
  ? clipboardText
  : resolveAgainstPaneCwd(clipboardText);

openPreview(filePath);
