# herdr-file-preview

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![platforms](https://img.shields.io/badge/platforms-windows%20%7C%20linux%20%7C%20macos-lightgrey)
![no dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

Ctrl+click a `file:///...` link in a [Herdr](https://herdr.dev) pane and preview
it in a pane on the right — instead of it launching whatever app is registered
for that file extension.

```
┌─────────────────────────────┐┌─────────────────────────────┐
│ $ claude                     ││ report.md                    │
│                               ││ ──────────────────────────  │
│ Wrote the report to           ││ # Q3 Infra Review             │
│ file:///…/report.md ◄─ click  ││                               │
│                               ││ ## Summary                    │
│ $                             ││ Latency dropped 40% after…    │
└─────────────────────────────┘└─────────────────────────────┘
        agent pane                    preview pane (glow)
```

## Why

Herdr only treats text shaped like a URL (`scheme://...`) as clickable —
plain file paths printed in terminal output are never clickable, plugin or
not. So this only helps for `file://` links something *emits on purpose* —
e.g. an agent that prints `file:///C:/Users/you/report.md` when it wants to
point you at something worth reading, instead of leaving it as a bare path
in prose.

## Install

```sh
herdr plugin install JulenCestero/herdr-file-preview
```

Or for local development:

```sh
herdr plugin link /path/to/herdr-file-preview
```

## Behavior

Ctrl+click (the modified-click gesture on every platform, including macOS)
on a link matching `^file://` opens a right split pane and renders the
target file. Clicking another `file://` link closes the previous preview
pane first, so you get one reused pane instead of a stack of them.

## How it works

Two entrypoints, both plain Node.js — no dependencies, no build step, one
code path for Windows, Linux, and macOS:

- **`action.js`** — runs on click. Reads the clicked URL from
  `HERDR_PLUGIN_CLICKED_URL`, closes the previously-opened preview pane
  (tracked in `HERDR_PLUGIN_STATE_DIR`), and asks Herdr to open a new split
  pane running `preview.js`.
- **`preview.js`** — runs inside that pane. Resolves the `file://` URL to a
  local path with Node's own `fileURLToPath` (handles Windows drive letters
  and POSIX paths correctly without manual parsing), then pipes it through
  [`glow`](https://github.com/charmbracelet/glow) if it's on `PATH`, or dumps
  the raw file otherwise.

## Requirements

- [Node.js](https://nodejs.org) on `PATH` — the plugin's own runtime.
- [`glow`](https://github.com/charmbracelet/glow) on `PATH` (optional) —
  for styled markdown rendering. Without it, the pane falls back to a raw
  text dump of the file.

## Known limitation

The reused-pane tracking (`HERDR_PLUGIN_STATE_DIR/preview_pane_id`) is one
file per plugin install, not per workspace. With more than one Herdr window
open at once, clicking a `file://` link in one window can close a preview
pane that belongs to a different window.

## License

[MIT](LICENSE)
