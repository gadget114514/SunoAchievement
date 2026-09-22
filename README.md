# Suno Achievement

A desktop app that turns any public Suno profile into an achievement showcase. Paste a profile URL, and the app pulls every public song and evaluates 32 badges across catalog size, plays, likes, per-song tiers, superlatives, streaks, diversity, community, and hidden gems.

![Electron](https://img.shields.io/badge/Electron-44-47848f) ![Platform](https://img.shields.io/badge/platform-Windows-0078d4) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 32 achievements with locked/unlocked states and live progress bars
- Condensed panel layout tuned for 1920x1080 — all 32 badges visible without scrolling
- One-click snapshot: exports the full achievement panel as an exact 1920x1080 JPEG
- Profile stats: songs, total plays, likes, comments, catalog length, followers
- Sortable, searchable song list with inline audio preview and links to Suno
- Five languages: English, Japanese, Spanish, French, Russian (auto-detected, switchable)
- Local cache per profile — instant load on next launch, then refreshes in the background
- Import/export profile data as JSON
- All network access happens in the Electron main process, so there are no CORS issues and no proxy needed

## Requirements

- Windows 10/11 (x64)
- Node.js 18+ for development (tested with Node 24)

## Getting started

```bash
npm install
npm start
```

Paste a profile URL in the format `suno.com/@handle` (or just `@handle`) and press Load.

## Snapshots

Press **Save snapshot (.jpg)** to export a shareable 1920x1080 JPEG of the achievement panel. The snapshot is rendered in a dedicated hidden window at exactly 1920x1080 in the currently selected language, waits for avatars and covers to load, then captures the page. It is fully self-contained: profile header, stats, completion ring, and all 32 badges with progress.

## Building Windows installers

```bash
npm run dist
```

Outputs to `dist/`:

- `SunoAchievement-Setup-1.0.0.exe` — NSIS installer (choose install directory)
- `SunoAchievement-Portable-1.0.0.exe` — portable, no installation needed

Builds are unsigned, so Windows SmartScreen may show a warning.

## Command-line scraper

The same fetch core is available without the GUI:

```bash
node scripts/scrape.js --handle @suno --out suno.json
node scripts/scrape.js --handle https://suno.com/@suno --max-pages 5 --compact
```

Useful for bulk exports; the JSON can be imported into the app later.

## Achievements

| Category | Badges |
| --- | --- |
| Catalog | First Note, Getting Started, Prolific, Centurion, Legend |
| Plays | First Thousand, Ten Thousand, Hundred Thousand, Millionaire |
| Likes | First Like, Appreciated, Adored, Beloved |
| Song Tiers | Hit, Chart Topper, Viral, Anthem |
| Superlatives | Most Played, Muse, Conversation Starter |
| Time | Anniversary, Marathon Month, Creator Streak, Early Bird, Night Owl |
| Diversity | Genre Hopper, Model Collector, Contestant |
| Community | Followed, Rising Star, Influencer |
| Hidden Gems | Hidden Gem |

## How it works

- The main process calls Suno's public profile endpoint (`studio-api.prod.suno.com/api/profiles/{handle}`), paginating 20 songs per page with polite delays and exponential backoff on HTTP 429.
- Data is normalized, cached under `%APPDATA%/Suno Achievement/cache/`, and passed to the sandboxed renderer over a `contextBridge` IPC API.
- The renderer is plain HTML/CSS/JS with a strict CSP and no network access of its own.

## Project layout

```
main.js               Electron main process: window, IPC, caching, dialogs, snapshot capture
preload.js            contextBridge API exposed to the renderer
lib/suno-core.js      Fetching, pagination, normalization (shared with the CLI)
scripts/scrape.js     Command-line scraper
renderer/             UI: index.html, css/, js/ (config, i18n, achievements, suno, app)
renderer/snapshot.html  Fixed 1920x1080 capture view for the JPEG snapshot
```

## Notes

- Suno's API is undocumented and may change; all coupling is isolated in `lib/suno-core.js`.
- This project is unofficial and not affiliated with Suno.
- Only public profile data is read; no accounts, tokens, or credentials are used.

## License

MIT
