# Estate Agency — Property Card Page

Autonomous demo package for a real-estate property card page: gallery with video, price block with currency conversion, deal terms, property/building characteristics, agent contacts, map, share/request modals, and print support (A4).

## Run locally
```
python -m http.server 8000
```
Then open http://localhost:8000.

The page is built with ES modules, so it must be served over HTTP (opening `index.html` via `file://` will not work). The page renders from mock data (`js/mock-data.js`, exposed as `window.MP_MOCK`). Real data can be supplied via the `mp:data` custom event on `.mp-root`.

## Demo video
The demo clip (~18 MB) is not committed to the repository. To enable the video carousel item:
1. Put your video file at `assets/mock/video.mp4` (the path is already in `.gitignore`).
2. Set `video: 'assets/mock/video.mp4'` in `js/mock-data.js` (or pass any other URL via the `video` field).

## Deploy
Push the repository to GitHub and enable GitHub Pages in the repository settings.

## Project structure
- `index.html` — standalone markup of the card (all inside `.mp-root`, classes prefixed with `mp-`)
- `css/style.css` — all styles, isolated under `.mp-root`
- `js/main.js` — bootstrap: initial render, `mp:data` event, modal close wiring, print hooks
- `js/modules/` — interactivity, split by responsibility:
  - `state.js` — root element, current dataset, mock server contract (`MP`), toast
  - `format.js` — currency/number formatting, phone mask, exchange rates
  - `layout.js` — title auto-fit, info block alignment and proportional scaling
  - `price.js` — expandable price breakdown, 4x3 price grid (₽ / $ / €)
  - `share.js` — share modal, copy link, QR images
  - `interest.js` — "leave a request" modal, phone mask, form submit
  - `map.js` — map (Yandex iframe + static image for print), geocoding
  - `gallery.js` — gallery, lightbox, video modal, full card rendering
- `js/mock-data.js` — centralized mock data
- `assets/` — icons, fonts, mock photos
- `agent.md` — the source-of-truth spec used to generate this package (integration contract for the PHP integrator)

## Lint
```
npm install
npm run lint
```

## Screenshots
See `images/` (embedded below).

![Property card — desktop](images/screenshot-desktop.png)

![Property card — mobile](images/screenshot-mobile.png)
