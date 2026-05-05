# Amin Ventures Field Checklist PWA

Offline-capable construction field checklist for daily logs, inspections, defects, photos, and exports.

## Run locally

For testing only on this Mac:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/
```

For testing from an iPhone on the same Wi-Fi, bind the server to all interfaces:

```sh
python3 -m http.server 8765 --bind 0.0.0.0
```

Then open the Mac's Wi-Fi IP address from Safari on the iPhone. Example:

```text
http://192.168.1.88:8765/
```

Do not use `127.0.0.1` on the iPhone. On iPhone, `127.0.0.1` means the iPhone itself, not this Mac.

## Added functionality

- Real service-worker caching for the app shell, manifest, icons, upgrade scripts, and runtime CDN libraries.
- Offline/online status chip on screen.
- Tools drawer with whole-app progress metrics.
- Full checklist search across stage, section, item, help text, notes, trade, and location.
- Quick filters for failed, open, and high-priority items.
- Full JSON backup including local checklist state and IndexedDB photo records.
- JSON restore for moving field data between devices.
- CSV export for lightweight office workflows.
- Safer reset confirmation that clears only checklist/photo data and keeps the offline app installed.
- Manifest enhancements for description, categories, orientation, app ID, display override, and shortcuts.

## Publish

To make this app available to everybody, publish the files to any HTTPS static host:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any web server with HTTPS

The easiest path for the existing public app is GitHub Pages:

1. Open the GitHub repository that owns the public site.
2. Upload or commit the files below to the published branch/folder.
3. Make sure GitHub Pages is enabled for that branch/folder.
4. Share the GitHub Pages URL with users.

For your current public style of URL, users should open an HTTPS link like:

```text
https://drelhamipython.github.io/AV-Checklist-V5-4/
```

Do not share `127.0.0.1`, `localhost`, or a `192.168.x.x` link. Those are only for local testing.

Publish these files:

- `index.html`
- `manifest.json`
- `service-worker.js`
- `app-upgrades.css`
- `app-upgrades.js`
- `.nojekyll`
- `icons/icon-192.png`
- `icons/icon-512.png`
