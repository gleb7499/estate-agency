# Estate Agency — Property Card Page

Autonomous demo package for a real-estate property card page: gallery with video, price block with currency conversion, deal terms, property/building characteristics, agent contacts, map, share/request modals, and print support (A4).

## Run locally
```
python -m http.server 8000
```
Then open http://localhost:8000.

The page renders from mock data (`js/mock-data.js`, exposed as `window.MP_MOCK`). Real data can be supplied via the `mp:data` custom event on `.mp-root`.

## Deploy
Push the repository to GitHub and enable GitHub Pages in the repository settings.

## Project structure
- `index.html` — standalone markup of the card (all inside `.mp-root`, classes prefixed with `mp-`)
- `css/style.css` — all styles, isolated under `.mp-root`
- `js/script.js` — interactivity: gallery, lightbox, video modal, currency conversion, phone mask, map (Yandex iframe + static image for print)
- `js/mock-data.js` — centralized mock data
- `assets/` — icons, fonts, mock photos/video
- `agent.md` — the source-of-truth spec used to generate this package (integration contract for the PHP integrator)

## Screenshots
See `images/` (embedded below).

![Property card — desktop](images/screenshot-desktop.png)

![Property card — mobile](images/screenshot-mobile.png)
