'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Opens filePath in the reused preview pane, closing whatever preview pane
// was open before. Shared by action.js (link click) and open-selection.js
// (keybinding on a copied path).
function openPreview(filePath) {
  const herdrBin = process.env.HERDR_BIN_PATH || 'herdr';
  const stateDir = process.env.HERDR_PLUGIN_STATE_DIR || '.';
  const paneIdFile = path.join(stateDir, 'preview_pane_id');
  const anchorPane = process.env.HERDR_PANE_ID || '';

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
  args.push('--env', `FILE_PATH=${filePath}`, '--focus');

  const result = spawnSync(herdrBin, args, { encoding: 'utf8' });

  if (result.error) {
    process.stderr.write(`could not run herdr: ${result.error.message}\n`);
    return;
  }
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `herdr plugin pane open failed (exit ${result.status})\n`);
    return;
  }

  let newPaneId = '';
  try {
    const parsed = JSON.parse(result.stdout);
    newPaneId = parsed?.result?.plugin_pane?.pane?.pane_id || '';
  } catch {
    // couldn't parse the response — next call just opens a fresh pane instead of reusing
  }
  if (newPaneId) {
    fs.writeFileSync(paneIdFile, newPaneId);
  } else {
    try { fs.unlinkSync(paneIdFile); } catch {}
  }
}

module.exports = { openPreview };
