# herdr-file-preview

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![platforms](https://img.shields.io/badge/platforms-windows%20%7C%20linux%20%7C%20macos-lightgrey)
![no dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

Ctrl+click a file-preview link printed in a [Herdr](https://herdr.dev) pane and
preview that file in a pane on the right — instead of it launching whatever
app is registered for that file extension.

```
┌─────────────────────────────┐┌─────────────────────────────┐
│ $ claude                     ││ report.md                    │
│                               ││ ──────────────────────────  │
│ Wrote the report to           ││ # Q3 Infra Review             │
│ …herdr-file-preview.invalid/  ││                               │
│ open?path=…report.md ◄─ click ││ ## Summary                    │
│ $                             ││ Latency dropped 40% after…    │
└─────────────────────────────┘└─────────────────────────────┘
        agent pane                    preview pane (glow)
```

## Why

Herdr's own client only ever treats `http://`/`https://` text as
hoverable/clickable at all — verified in `herdrdev/herdr`'s source
(`src/app/actions.rs`, `safe_web_url`). A `file://` link, OSC 8 hyperlink or
not, never reaches a plugin's `link_handler`: the base UI layer filters it
out before that. There's no config to widen it.

So this plugin's trigger link isn't `file://` — it's a fake
`http://herdr-file-preview.invalid/open?path=<encoded path>` URL.
`.invalid` is the RFC 2606 TLD guaranteed to never resolve. The link is
never actually fetched: Herdr's `link_handler` intercepts the click before
it would try to open the URL externally, so the non-resolving domain is
just a trigger shape, not a real address. This only helps for a link
something *emits on purpose* — e.g. an agent that prints one of these when
it wants to point you at something worth reading, instead of leaving it as
a bare path in prose.

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
on a link matching `^https?://herdr-file-preview\.invalid/open\?path=`
opens a right split pane and renders the target file. Clicking another
file-preview link closes the previous preview pane first, so you get one
reused pane instead of a stack of them.

To emit a link, URL-encode the absolute path and build:

```
http://herdr-file-preview.invalid/open?path=<encoded absolute path>
```

### Plain paths (no link required)

Not everything that mentions a file formats it as a link — a plain path in
prose is never clickable in Herdr, link or no link (see Why, above). For
that case, bind a key to the `open-selection` action:

```toml
[[keys.command]]
key = "ctrl+alt+f"
type = "plugin_action"
command = "jc.file-preview.open-selection"
description = "preview copied file path"
```

Select the path (double-click uses Herdr's own path-aware smart selection;
drag-select or copy mode also work), copy it, then press the bound key.
Relative paths resolve against the *focused pane's* working directory, so
this also handles a relative path exactly as an agent would print it in its
own shell.

## How it works

Four files, all plain Node.js — no dependencies, no build step, one code
path for Windows, Linux, and macOS:

- **`open-pane.js`** — shared logic: closes the previously-opened preview
  pane (tracked in `HERDR_PLUGIN_STATE_DIR`) and asks Herdr to open a new
  split pane running `preview.js` for the given path.
- **`action.js`** — the link-click action. Reads the clicked URL from
  `HERDR_PLUGIN_CLICKED_URL`, pulls the `path` query param back out, hands
  it to `open-pane.js`.
- **`open-selection.js`** — the keybinding action. Reads the system
  clipboard, strips wrapping quotes/punctuation, resolves a relative path
  against the focused pane's cwd (`herdr pane get`), hands it to
  `open-pane.js`.
- **`preview.js`** — runs inside the preview pane. Reads the path from
  `FILE_PATH` and pipes it through [`glow`](https://github.com/charmbracelet/glow)
  if it's on `PATH`, or dumps the raw file otherwise.

## Requirements

- [Node.js](https://nodejs.org) on `PATH` — the plugin's own runtime.
- [`glow`](https://github.com/charmbracelet/glow) on `PATH` (optional) —
  for styled markdown rendering. Without it, the pane falls back to a raw
  text dump of the file.

## Known limitation

The reused-pane tracking (`HERDR_PLUGIN_STATE_DIR/preview_pane_id`) is one
file per plugin install, not per workspace. With more than one Herdr window
open at once, clicking a file-preview link in one window can close a
preview pane that belongs to a different window.

## License

[MIT](LICENSE)
