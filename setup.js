#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Plugins can't register keybindings themselves — Herdr only reads those
// from the user's own config.toml. This is the one-command stand-in for
// hand-editing that file: append the block, reload the running server.
const ACTION = 'jc.file-preview.open-selection';
const KEY = 'ctrl+f';

function configPath() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'herdr', 'config.toml');
  }
  return path.join(os.homedir(), '.config', 'herdr', 'config.toml');
}

const file = configPath();
let content = '';
try {
  content = fs.readFileSync(file, 'utf8');
} catch {
  // no config file yet — Herdr runs fine without one; we'll create it
}

if (content.includes(ACTION)) {
  console.log(`already configured in ${file} — nothing to do.`);
  process.exit(0);
}

const block = `\n[[keys.command]]\nkey = "${KEY}"\ntype = "plugin_action"\ncommand = "${ACTION}"\ndescription = "preview copied file path"\n`;

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.appendFileSync(file, block);
console.log(`bound "${KEY}" to preview a copied file path, in ${file}`);
console.log('if that chord collides with your terminal or OS, edit the key in that file — see the README for known collisions.');

const herdrBin = process.env.HERDR_BIN_PATH || 'herdr';
const reload = spawnSync(herdrBin, ['server', 'reload-config'], { encoding: 'utf8' });
if (reload.status === 0) {
  console.log('reloaded the running Herdr server — the key is live now.');
} else {
  console.log('no running Herdr server to reload — it applies next time Herdr starts.');
}
