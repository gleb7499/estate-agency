# agent.md — Source of truth for the frontend agent

# 1. Purpose of this document

> Note (2026-09): `js/script.js` has since been split into ES modules — `js/main.js` (bootstrap) plus `js/modules/*.js` (state, format, layout, price, share, interest, map, gallery) — and is loaded via `<script type="module" src="js/main.js">`. All integration contracts below (custom events, `MP.sendToServer`, `window.MP_MOCK`) are unchanged.

This file is the single reference for generating the HTML/CSS/JS of a **local, autonomous property card page**, which a colleague (Ilya) will then integrate into a legacy project. The document sets hard rules on isolation, class naming, the structure of the delivered files, and the format of instructions for the integrator. You do the frontend — the integrator inserts it into PHP.

---

# 2. What you do (markup developer responsibilities)

* You create an autonomous demo package: `index.html`, `css/style.css`, `js/script.js`, `assets/` (img/fonts/vendor).
* You build the exact visual per the designs (colors/type/spacing/components), without access to the server.
* You change nothing on the server and do not attempt to connect to its files.
* You prepare `README.integration.md` — a clear set of replacement patches and instructions for the integrator.
* You document every place where your HTML depends on dynamic data (e.g. `data-object-id`, itemprop, attributes for prices and contacts).

---

# 3. Mandatory rules (hard — not negotiable)

1. **Full isolation under `.mp-root`**
   All HTML must be inside:

   ```html
   <div class="mp-root mp-object-card"> ... </div>
   ```

   All CSS rules and JS selectors — only inside `.mp-root`.

2. **Class prefix: `mp-`**
   All component, utility, and style classes carry the `mp-` prefix (e.g. `.mp-title`, `.mp-price`, `.mp-gallery`).

3. **Zero global styles and zero system-wide changes**
   No rule may modify `html`, `body`, `a`, `button` globally. Only `.mp-root a` and the like.

4. **No inline scripts in the final build; inline styles kept to a minimum**

   * JS — only in `js/script.js`. The script is loaded with `defer`.
   * Inline styles are allowed in drafts only; in the final delivery all styles are moved to `css/style.css`.
     This protects against CSP/legacy restrictions and accidental conflicts with server code.

5. **No direct network requests to the production API**
   If behavior implies server calls — implement a mock scenario and note in the README which endpoints and payloads are needed.

6. **We do not touch PHP/server logic**
   You do not modify `getlist3.php`, `index_newagency3.html`, etc. Everything that needs to change on their side — your prepared diff patches and instructions for the integrator.

7. **Local dependencies**
   If a library is needed (slider, lightbox), bundle it locally in `assets/vendor/` and state its version and license. Do not use a CDN without the integrator's consent.

---

# 4. What you deliver (concretely)

1. `index.html` — a standalone example rendering all card blocks (photos, title, price, address, parameters, contacts, description, map, "Interested / Not interested" buttons). Inside — the real DOM structures and data attributes the production code expects.
2. `css/style.css` — all styles, fully scoped to `.mp-root`.
3. `js/script.js` — all interactivity (gallery, currency switch, "interested" events, modals). Includes mock requests and emits custom events for the integrator.
4. `assets/` — images/icons/fonts/vendor.
5. `README.integration.md` — detailed instructions for the integrator (see section 6).
6. `design_notes.md` (optional) — small decisions on typography, grid, and behavior that matter when embedding.

---

# 5. How I picture the DOM structure (example)

(use this as a template — all classes with the `mp-` prefix)

```html
<div class="mp-root mp-object-card" data-object-id="606239">
  <header class="mp-header">
    <h1 class="mp-title" itemprop="name">Property name</h1>
    <p class="mp-price" itemprop="offers">12 000 000 ₽</p>
    <p class="mp-address">City, Street, bld. 1</p>
  </header>

  <section class="mp-gallery" aria-label="Photos">
    <!-- preview/lightbox -->
  </section>

  <section class="mp-params">
    <p class="mp-area">Area: 120 m²</p>
    <p class="mp-info">Rooms: 3 • Floor: 2/9</p>
  </section>

  <section class="mp-actions">
    <button class="mp-btn mp-fav" data-action="favorite">Interested</button>
    <button class="mp-btn mp-unfav" data-action="unfavorite">Not interested</button>
  </section>

  <section class="mp-desc">
    <h2>Description</h2>
    <p>Description text...</p>
  </section>

  <section class="mp-contacts">
    <!-- agent/company contacts -->
  </section>

  <section class="mp-map">
    <!-- map placeholder / coordinates -->
  </section>
</div>
```

---

# 6. README.integration.md — clear template for the integrator (include in the delivery)

The README must be as practical as possible: exact lines, diff patches, order of operations, and rollback recommendations.

Example README content (required sections):

1. **Introduction** — "I built an autonomous page; I did not touch the server; here is the set of files".

2. **Where the template lives in production** — `templates/index_newagency3.html` (inserts the "Property information" line), and all the rest of the HTML is assembled by `system/getlist3.php`.

3. **List of places in `getlist3.php` that commonly use inline styles/HTML** (function names):

   * `mode_getboard`
   * `_item`
   * `_photos3`
   * `_usobjects_price` / `_usobjects_price_table`
   * `_usobjects_agencies_block`
   * `_geo_board`

4. **Recommended safe integration order (steps)**:

   * Make a BACKUP of the original files (`getlist3.php`, `index_newagency3.html`).
   * Upload `css/style.css` into the project folder (preferably a staging subfolder).
   * Insert HTML fragments from `index.html` into `{$content}`, or minimally replace the line in `index_newagency3.html` (variant to be discussed).
   * Apply the patches to `getlist3.php` (see examples below).
   * Load `js/script.js` (after the static assets).
   * Run the smoke tests (included in the README).
   * On failure — roll the files back from the backup.

5. **Example diff patches (recommended PHP changes)**
   These patches are templates. The integrator inserts them into `getlist3.php` in the corresponding places.

   Example 1 — title:

   ```diff
   - $result .= '<h1 style="font-size: 25px; margin-top: 0; padding-bottom: 5px;"><span itemprop="name">' . $s_header . '</span></h1>';
   + $result .= '<h1 class="mp-title"><span itemprop="name">' . $s_header . '</span></h1>';
   ```

   Example 2 — price:

   ```diff
   - $result .= '<p style="font-size: 17px; margin-top: 0; padding-bottom: 5px;">' . $s_price . '</p>';
   + $result .= '<p class="mp-price">' . $s_price . '</p>';
   ```

   Example 3 — address:

   ```diff
   - $result .= '<p style="font-size: 17px; margin-top: 0; padding-bottom: 5px; color: #009900;">' . $item_address . '</p>';
   + $result .= '<p class="mp-address">' . $item_address . '</p>';
   ```

   Example 4 — gallery container:

   ```diff
   - $result .= '<div class="photos" ...>'.$photos_html.'</div>';
   + $result .= '<div class="mp-gallery">'.$photos_html.'</div>';
   ```

   > Note: the patches are simple — they replace `style="..."` with `class="mp-..."`. No server logic is changed.

6. **Data attributes and expectations**
   List the data attributes needed for integration (example):

   * `data-object-id` — object id (used in AJAX).
   * `data-price-currency` — currency.
   * `data-agent-id` — agent id.

7. **Smoke tests (short checklist for the integrator)**

   * Open the property page (example URL) and compare with the design.
   * Verify the `.mp-root` styles applied and do not break the host site.
   * Check button clicks, gallery opening, correctness of prices and contacts.
   * Verify there are no JS errors in the console.

8. **Rollback** — how to restore the files from the backup (commands/path). (PLACEHOLDER: the integrator fills this in per environment).

---

# 7. JS contract: events and mock endpoints

* All interactive actions emit custom events on `.mp-root`, which the integrator can listen to:

  * `mp:favorite:toggle` — toggling interest. Detail: `{ objectId, state }`.
  * `mp:gallery:open` — opening the lightbox. Detail: `{ index }`.
* If real requests are needed — keep a function `MP.sendToServer(action, payload)` in `js/script.js` — a mock by default (logs), with the README describing how to replace it with real AJAX.

---

# 8. Security and operations

* **No secrets** in the code.
* Recommend SFTP/FTPS to the integrator. If they must use FTP — keep the risks in mind.
* Remind the integrator about the mandatory backup before any replacement.

---

# 9. Note to the agent (behavior when generating code / auto-generation)

1. **Before generating** — check this file.
2. **Generate only autonomous fragments** (index + css + js + assets + README).
3. **If you encounter a `[TBD: ...]`** — return a concrete list of questions (do not change the rules).
4. **All proposed diff patches** — go into the README, marked "for the integrator", and are never applied automatically.
5. **Do not try to guess the PHP internals** — if behavior is needed, define a contract (data attributes + events) that the integrator implements in PHP.

---

# 10. Quick cheat sheet (for you, the markup developer — 5 points)

1. Build an autonomous demo package — do not touch the server.
2. Wrap everything in `.mp-root`.
3. Move all styles into `css/style.css` before delivery.
4. In the README, make clear diff patches for the integrator (replace `style="..."` with `class="mp-..."`).
5. Provide a mock `MP.sendToServer` and emit custom events — integration should be a simple mock→real swap.
