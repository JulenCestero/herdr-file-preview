#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { fileURLToPath } = require('node:url');

const rawUrl = process.env.FILE_URL || process.env.HERDR_PLUGIN_CLICKED_URL || '';

function waitForEnter() {
  process.stdout.write('\npress enter to close this preview...');
  try {
    fs.readSync(0, Buffer.alloc(1), 0, 1, null);
  } catch {
    // stdin not readable (e.g. closed) — nothing left to wait on
  }
}

if (!rawUrl) {
  console.log('missing FILE_URL');
  waitForEnter();
  process.exit(0);
}

let filePath;
try {
  filePath = fileURLToPath(rawUrl);
} catch {
  console.log(`not a file:// URL:\n${rawUrl}`);
  waitForEnter();
  process.exit(0);
}

if (!fs.existsSync(filePath)) {
  console.log(`file not found:\n${filePath}`);
  waitForEnter();
  process.exit(0);
}

const glow = spawnSync('glow', ['-p', filePath], { stdio: 'inherit' });

if (glow.error) {
  // glow not installed — fall back to a raw dump
  console.log(filePath);
  console.log('-'.repeat(Math.min(filePath.length, 80)));
  process.stdout.write(fs.readFileSync(filePath, 'utf8'));
} else if (glow.status !== 0) {
  console.log(`glow exited with status ${glow.status}`);
}
waitForEnter();
