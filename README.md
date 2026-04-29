# VetPuzzle

A powerful Edpuzzle bookmarklet with a clean modern UI. Fetch answers, skip videos, auto-answer questions, and more.

## Features

- **Fetch Answers** — instantly retrieves all MC answers for any assignment
- **Auto Answer** — automatically submits MC answers
- **Skip Video** — jump to any point in the video
- **Stealth Mode** — randomizes timing to appear more human
- **Speed Control** — playback up to 16×
- **No Autopause** — keeps playing when you switch tabs
- **Canvas & Schoology** support

## Install

1. Show your bookmarks bar (`Ctrl+Shift+B` / `Cmd+Shift+B`)
2. Drag the button from https://xluski.github.io/VetPuzzle into the bar
3. Navigate to an Edpuzzle assignment and click it

Or manually create a bookmark with this URL:

```
javascript:fetch('https://cdn.jsdelivr.net/gh/xluski/VetPuzzle@latest/script.js').then(r=>r.text()).then(r=>eval(r))
```

## Usage

1. Go to any Edpuzzle assignment (`edpuzzle.com/assignments/.../watch`)
2. Click the VetPuzzle bookmarklet
3. A popup will appear with answers and controls
4. Toggle features on/off and click **Run**

Works on Canvas and Schoology embedded Edpuzzles too.

## Credits

Based on [ading2210/edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers) — all credit to the original author for the core approach.

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE)

```
VetPuzzle - Edpuzzle Utilities
Copyright (C) 2025 xluski

Based on ading2210/edpuzzle-answers
Copyright (C) 2025 ading2210

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```
