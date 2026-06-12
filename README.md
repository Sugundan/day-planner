# Day Planner — Install as a Mobile App (PWA)

This folder contains everything needed to install Day Planner on your phone like a real app — with its own home-screen icon, fullscreen mode (no browser bar), and offline support.

## Files
- `index.html` — the app
- `manifest.json` — app name, icon, and display settings
- `sw.js` — service worker (offline support)
- `icon-*.png`, `apple-touch-icon.png` — app icons

## Step 1: Host it free (takes ~2 minutes, no coding)

A PWA needs to be served over HTTPS. The easiest free option:

### Netlify Drop (no account needed to try)
1. On a computer, go to **https://app.netlify.com/drop**
2. Drag this entire folder onto the page
3. You'll instantly get a link like `https://something.netlify.app`

### Or GitHub Pages (free, permanent)
1. Create a free GitHub account → new repository
2. Upload all files from this folder
3. Repo Settings → Pages → set Source to "main" branch → Save
4. Your app will be live at `https://yourname.github.io/reponame`

## Step 2: Install on your phone

### Android (Chrome)
1. Open your hosted link in Chrome
2. Tap the **⋮ menu** → **"Add to Home screen"** (or you may see an "Install app" prompt automatically)
3. Tap **Install**

That's it — the Day Planner icon appears on your home screen and opens fullscreen like any app. It also works offline after the first load.

### iPhone (Safari)
1. Open the link in Safari
2. Tap the **Share** button → **"Add to Home Screen"**

## Notes
- Your goals and schedule are saved in the app's local storage on your phone — they persist between sessions.
- The "Save to Google Sheets" feature still requires an internet connection.
- If you update index.html later, bump `CACHE = 'day-planner-v1'` to `v2` in sw.js so phones pick up the new version.
