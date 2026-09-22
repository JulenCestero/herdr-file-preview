# herdr-file-preview

Ctrl+click a `file:///...` link in a [Herdr](https://herdr.dev) pane and preview
it in a pane on the right, instead of it launching whatever app is registered
for that file extension.

Renders with [`glow`](https://github.com/charmbracelet/glow) when it's on
`PATH`, falls back to a raw text dump otherwise. Pure Node.js (stdlib only,
no dependencies, no build step), so it runs the same on Windows, Linux, and
macOS.

## Why

Herdr only treats text shaped like a URL (`scheme://...`) as clickable —
plain file paths in terminal output are never clickable, plugin or not. So
this only helps for `file://` links something *emits on purpose* — e.g. an
agent that prints `file:///C:/Users/you/report.md` when it wants to point
you at something worth reading.

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

## Known limitation

The reused-pane tracking (`HERDR_PLUGIN_STATE_DIR/preview_pane_id`) is one
file per plugin install, not per workspace. With more than one Herdr window
open at once, clicking a `file://` link in one window can close a preview
pane that belongs to a different window.

## Requirements

- [Node.js](https://nodejs.org) on `PATH` — the plugin's own runtime.
- [`glow`](https://github.com/charmbracelet/glow) on `PATH` (optional) —
  for styled markdown rendering. Without it, the pane falls back to a raw
  text dump of the file.
