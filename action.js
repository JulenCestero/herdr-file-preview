#!/usr/bin/env node
'use strict';

const { openPreview } = require('./open-pane.js');

const clickedUrl = process.env.HERDR_PLUGIN_CLICKED_URL || '';

if (!clickedUrl) {
  console.error('missing HERDR_PLUGIN_CLICKED_URL');
  process.exit(0);
}

// Herdr only treats http(s):// text as a clickable/hoverable link at all
// (src/app/actions.rs: safe_web_url) — file:// links are invisible to it,
// no plugin can change that. So links use a fake http://*.invalid URL as a
// trigger; it's never actually fetched, the link_handler intercepts the
// click before Herdr would try to open it externally.
let filePath = '';
try {
  filePath = new URL(clickedUrl).searchParams.get('path') || '';
} catch {
  // malformed URL — filePath stays empty, handled below
}
if (!filePath) {
  console.error(`could not extract a path from: ${clickedUrl}`);
  process.exit(0);
}

openPreview(filePath);
