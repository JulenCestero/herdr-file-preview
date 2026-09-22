#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
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

const TRAILING_WRAP_CHARS = "`'\">)]}.,;:";

// Herdr's own copy-mode / double-click selection already picks out a
// whole path-shaped token, but prose tends to leave wrapping punctuation
// around it (quotes, a closing paren, a sentence-ending period). Stripping
// that with a plain regex is lossy — it can just as easily chew into a
// real filename that legitimately ends in one of those characters. So
// instead this builds candidates from least- to most-stripped and lets the
// filesystem decide which one is real, rather than guessing blind.
function trailingCandidates(text) {
  const candidates = [text];
  let cur = text;
  while (cur.length && TRAILING_WRAP_CHARS.includes(cur[cur.length - 1])) {
    cur = cur.slice(0, -1);
    candidates.push(cur);
  }
  return candidates;
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

function resolve(filePath) {
  return path.isAbsolute(filePath) ? filePath : resolveAgainstPaneCwd(filePath);
}

const raw = readClipboard().trim().replace(/^[`'"<(\[{]+/, '');

if (!raw) {
  console.error('clipboard is empty or unreadable');
  process.exit(0);
}

// trailingCandidates keeps stripping down to '' if raw is nothing but wrap
// chars (e.g. clipboard holding just "."); drop that before resolving, or
// the fallback candidate would resolve to the pane's cwd itself.
const candidates = trailingCandidates(raw).filter(Boolean);
if (!candidates.length) {
  console.error(`nothing left after stripping wrapping punctuation: ${JSON.stringify(raw)}`);
  process.exit(0);
}

const resolvedCandidates = candidates.map(resolve);
const filePath = resolvedCandidates.find((p) => fs.existsSync(p)) || resolvedCandidates.at(-1);

openPreview(filePath);
