# Offline Field & Travel Guide of Southern Africa

An installable, offline-first web app to capture the day's memories on your travels in three sections: **Flora**, **Fauna** and **Culture & sites**. Everything is stored on your device (IndexedDB). No account and no internet are needed after the first load.

© 2026 Henry van der Schyff. All rights reserved.

## The three sections
- **Flora:** common names (English / Afrikaans), family, genus, species, date observed, locality / specimen details, flowering season / month, **height of plant / tree**, research notes, photographs.
- **Fauna:** the same, without the flowering season and height, but with a **Tracks / spoor** box (you can even save an entry for unidentified spoor).
- **Culture & sites (field entry screen):** photographs (camera, gallery or internet downloads), title (optional), historical date / era (free text), province (the nine provinces, or "Outside South Africa" plus a country) and town / city (required), role players (one per line), field notes / story, and **Save to Diary**, which stores the entry with your GPS position and today's date and time.

## Day report (PDF or PowerPoint)
Choose dates and sections under **Printable day report**, then **Create PDF** or **Create PowerPoint**. Photos are shrunk to keep the file small, and every page or slide cites this app. Each entry also has a **PDF** button for a one-page report of just that entry.

## Also in the app
- **User manual**, **Field guides** (book lists for the Western Cape and other provinces) and **Donate** buttons at the top of the page.
- Backup & import: JSON (all sections, with photos) and CSV (text only, current section).
- Android back button closes the open window; **Install app** button on Chrome / Edge.

## Hosting / installing
Put the folder on any HTTPS site (for example GitHub Pages), open the link once while online, then install it. The report tools (`pdf-lib.min.js`, `pptxgen.bundle.js`) are cached with the app so reports also work offline.

When you change any file, raise `VERSION` in `sw.js` so installed copies update. Your existing records are kept: the app keeps the same internal database name.

## Files
`index.html`, `styles.css`, `app.js`, `config.js` (names, wording, copyright), `sw.js`, `manifest.webmanifest`, icons, `pdf-lib.min.js` and `pptxgen.bundle.js` (open-source report libraries, see `THIRD-PARTY-LICENSES.txt`).


## Publish with GitHub Pages

1. Create a new repository on GitHub (for example, `southern-africa-field-guide`).
2. Extract the ZIP. It creates a folder named `offline-field-travel-guide-github` containing the app files. Upload the **contents of that folder** to the repository root (so `index.html` is at the root, not buried inside another folder).
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for GitHub Pages to publish. Open the Pages URL once while online, then use **Install app** in Chrome or Edge.

The app is a static web app and does not need a build step. GitHub Pages provides HTTPS, which is required for service workers and installable offline behaviour. Keep the app files together in the same folder. When updating the app, increase `VERSION` in `sw.js` so existing installs refresh their cached files.
