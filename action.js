#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const herdrBin = process.env.HERDR_BIN_PATH || 'herdr';
const clickedUrl = process.env.HERDR_PLUGIN_CLICKED_URL || '';
const stateDir = process.env.HERDR_PLUGIN_STATE_DIR || '.';
const paneIdFile = path.join(stateDir, 'preview_pane_id');
const anchorPane = process.env.HERDR_PANE_ID || '';

if (!clickedUrl) {
  console.error('missing HERDR_PLUGIN_CLICKED_URL');
  process.exit(0);
}

// Close the previous preview pane first so this click replaces it instead of
// stacking a new split every time.
let prevPaneId = '';
try {
  prevPaneId = fs.readFileSync(paneIdFile, 'utf8').trim();
} catch {
  // no previous pane recorded
}
if (prevPaneId) {
  spawnSync(herdrBin, ['plugin', 'pane', 'close', prevPaneId], { stdio: 'ignore' });
}

const args = [
  'plugin', 'pane', 'open',
  '--plugin', 'jc.file-preview',
  '--entrypoint', 'preview',
  '--placement', 'split',
  '--direction', 'right',
];
if (anchorPane) args.push('--target-pane', anchorPane);
args.push('--env', `FILE_URL=${clickedUrl}`, '--focus');

const result = spawnSync(herdrBin, args, { encoding: 'utf8' });

if (result.status !== 0) {
  process.stderr.write(result.stderr || `herdr plugin pane open failed (exit ${result.status})\n`);
  process.exit(0);
}

let newPaneId = '';
try {
  const parsed = JSON.parse(result.stdout);
  newPaneId = parsed?.result?.plugin_pane?.pane?.pane_id || '';
} catch {
  // couldn't parse the response — next click just opens a fresh pane instead of reusing
}
if (newPaneId) {
  fs.writeFileSync(paneIdFile, newPaneId);
} else {
  try { fs.unlinkSync(paneIdFile); } catch {}
}
