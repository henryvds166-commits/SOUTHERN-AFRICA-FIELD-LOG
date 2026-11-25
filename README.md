# Southern Africa Offline Field Log

An installable, offline-first field notebook for **education and research**. Record Southern African flora, fauna and cultural heritage observations. Your records and photographs are stored locally in the browser on your device; there is no account or cloud synchronisation.

© 2026 Henry van der Schyff. All rights reserved.

## Intended users

Learners, teachers, students, naturalists, citizen-science contributors, field researchers, guides and people documenting Southern African biodiversity and cultural heritage. The app is an educational and research aid, not an authoritative identification service or a replacement for expert review.

## The three sections

- **Flora:** English and Afrikaans common names, family, genus, species, date, locality, flowering season, plant height, research notes and photographs.
- **Fauna:** common and scientific names, family, date, locality, tracks / spoor, research notes and photographs.
- **Cultural sites:** site title, historical era, province or country, town, role players, visit date, GPS and field notes. New photographs in this section are captured with the device camera; gallery and internet-download uploads are not offered.

## Offline species catalogue

`species-data.js` contains the hidden, locally bundled reference catalogue. The flora list is built from the supplied South African flora CSV. The fauna list is a starter selection of representative Southern African mammals, birds, reptiles and amphibians. Type a genus or common/scientific name (for example **Protea**) in the species lookup and select a suggestion to populate the observation form. The catalogue is not exhaustive; confirm uncertain identifications with current field references or specialists.

## Camera

The camera panel offers lens/device selection when the browser exposes multiple cameras, and macro focus only when the camera reports support. Image stabilisation is enabled only where the device/browser exposes a compatible capability; otherwise it remains device-managed. Camera support varies by browser, hardware and secure-context permissions.

## Reports (PDF and Word), photos and backups

Choose dates and sections under **Day or trip report & photos**, then create a **PDF** or an editable **Word document (.docx)** of that day or trip, with entries, photographs and a citation to the app. Each observation also has its own PDF action.

**Photos on this device:** a web app cannot create folders in a phone's gallery by itself, so the app offers: **Save photos as ZIP** (folders Flora / Fauna / Cultural and tourist sites, plus a photo-list.csv), **Share photos** (phones that support it), a **Save photo** button in the photo viewer, and, in Chrome or Edge on a computer, **Choose photo folder** so photos are saved into your own folder (optionally automatically whenever you save an entry).

Export JSON regularly to back up all entries and photographs. CSV exports contain text only.

## Terms, copyright and third-party licences

This app is provided as an educational and research tool. The original app name, branding, interface, text, artwork and source material may not be copied, duplicated, repackaged, resold, published or redistributed without written permission, except where applicable law or a separate licence expressly allows it. Your own observations remain yours. Third-party components remain governed by their own licence agreements; retain and respect their notices in `THIRD-PARTY-LICENSES.txt`.

Users must comply with land access rules, conservation regulations and cultural-site protocols. Do not disturb wildlife, plants, archaeological material or heritage sites. Protect sensitive species and cultural-location data. The app does not guarantee identification accuracy, catalogue completeness, GPS availability or uninterrupted operation. Keep independent backups.

## Hosting / installing

Host the folder on an HTTPS site (for example GitHub Pages), open it once while online, then install it in Chrome or Edge. HTTPS is required for service workers, camera and installable offline behaviour. When changing files, bump `VERSION` in `sw.js`. The IndexedDB name remains unchanged to preserve existing user observations.

## Files

`index.html`, `styles.css`, `app.js`, `config.js`, `species-data.js`, `field-guide-hero.png`, `sw.js`, `manifest.webmanifest`, icons, `pdf-lib.min.js` and `THIRD-PARTY-LICENSES.txt`.
