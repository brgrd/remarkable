# REMARKABLE

**A minimalist, client-side markdown editor + formatter.**

![Version](https://img.shields.io/badge/version-1.0.0-ffffff)
![License](https://img.shields.io/badge/license-MIT-ffffff)

## Features

- Live markdown preview
- Find & replace (regex, in-selection, replace previews)
- Line numbers
- Formatting toolbar + prettify + validate
- Undo history + autosave (localStorage)
- Templates: structured PR template + lightweight section starters
- Template variables (project/user/version/date/etc.)
- Drag & drop upload, copy, export

## Run Locally

```bash
cd remarkable
python3 -m http.server 8000
# Visit http://localhost:8000
```

If you don’t want a server, you can also just open `index.html` in a browser (some browsers may restrict certain features when opened as a file).
Note: markdown rendering uses `marked` from a CDN by default, so the first load may require a network connection unless you vendor it locally.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + H` | Find & Replace |
| `Ctrl + S` | Save |
| `Ctrl + E` | Export to .md |
| `Ctrl + Shift + F` | Prettify |
| `Ctrl + Z` | Undo |
| `Ctrl + /` | Show shortcuts |

## Usage

### Editing
- Type markdown in the left pane, preview updates on the right.
- Content autosaves to your browser.

### Templates
- Use the Templates dropdown to insert at your cursor (or replace highlighted text).
- If you haven’t placed a cursor yet, templates fall back to “smart” placement based on conventional section order.
- The dropdown marks templates that already appear in the document.

### Template Variables
Template variable values persist in localStorage and apply to templates (PR title, project name, version, etc.).

### Lint
- Optional markdown lint rules (MD001/MD013/MD022/MD041/MD047) with a clickable issue list.
- Inline lint underlines; hover lines to see messages.

### Files
- Upload: button or drag/drop `.md` / `.txt` / `.markdown`
- Copy: copies the full markdown to clipboard
- Export: downloads a `.md` named from the first H1 (or timestamp)

## License

MIT. See `LICENSE`.
