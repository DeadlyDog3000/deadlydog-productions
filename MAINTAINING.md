# Maintaining the DeadlyDog Productions website

Plain HTML, CSS and a little JavaScript, served by GitHub Pages from `main`. No build step.

## Pages

- `index.html`: the studio's home (games, Work With Us, contact form that opens the visitor's own email app).
- `reckoning.html`, `forester.html`, `standards-in-smoke.html`: the game pages. Each sets `window.GAME = { … }` near the
  bottom (name, price, sale, downloads, reviews key) and loads `game-page.js`, which runs the gallery, the lightbox,
  the buy box, What's New and the reviews.
- `updates.html`: every Forester: Reckoning update, read live from the game's own `reckoning/js/changelog.js`.
- `presskit.html` and `presskit/deadlydog-press-kit.zip`: facts, art and screenshots for press.
- `privacy.html`: what the site, the shop and the game server keep. **Keep it true**: change it whenever `visit.js`
  or the server's data changes.
- `admin.html`: a copy of `~/deadlydog-admin/index.html` (with `noindex, nofollow`). It only shows anything on the
  owner's computer, where the admin panel runs. Copy it again after changing the panel:
  `sed 's/<meta name="robots" content="noindex">/<meta name="robots" content="noindex, nofollow">/' ~/deadlydog-admin/index.html > admin.html`
- `404.html`: uses absolute `/deadlydog-productions/…` paths, because GitHub serves it at any depth.

## Caching

GitHub Pages tells browsers to keep files for 10 minutes. After changing `styles.css`, `game-page.js` or `visit.js`,
bump its `?v=` in every page that loads it (the same value everywhere), e.g.
`sed -i '' 's/styles.css?v=OLD/styles.css?v=NEW/g' *.html`.

## Counting visits

`visit.js` (on every page, and loaded by the two browser games) tells the game server about a page view and about
clicks on Buy, the free demos and Play. It only counts on `*.github.io`, never on a local copy, and never in the
owner's browser (`localStorage dd-admin = 1`, set by opening the admin page). The numbers show on the admin page.

## Images

- Card-sized copies live in `media/cards/` (800 px) and gallery thumbnails in `media/*/thumbs/` (360 × 202).
- Reckoning's 1920-wide screenshots each have a 1280-wide copy in `media/reckoning/sm/` (`data-src-sm` on the thumb), which
  phones and small windows load instead. Make one for a new screenshot:
  `sips -s format jpeg -s formatOptions 78 --resampleWidth 1280 NN-name.jpg --out sm/NN-name.jpg`.
- Share pictures for link previews are 1200 × 630 (`media/cards/*_share.jpg`, `deadlydog_share.jpg`).
- No stumps anywhere in Forester: Reckoning's pictures.
- Only CC0 or our own art.
