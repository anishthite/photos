# photos

A Google Photos-style library, in the style of [thite.site](https://thite.site) — et-book serif, paper background, day-grouped grid, lightbox viewer, and simple search. Static shell on Cloudflare Pages, originals in a **private R2 bucket**, whole site behind a **password gate** (Pages Functions + HMAC-signed cookie).

## Adding photos

One command — copies files in, rebuilds the index, and redeploys to Cloudflare Pages:

```sh
scripts/add_photos.sh ~/Desktop/vacation           # import a folder of images
scripts/add_photos.sh ~/Desktop/pic.jpg beach      # one file, under photos/beach/
scripts/add_photos.sh --no-deploy ~/Downloads/pics # local only, skip the deploy
```

Or do it by hand: drop images/videos into `photos/` (subfolders become album labels), then run `python3 scripts/build_library.py`. Install `pillow` for EXIF dates (`pip install pillow`); otherwise file mtimes are used.

## Local preview

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

## Deploy

Deployed on Cloudflare Pages as the `photos` project (`photos-erv.pages.dev`, custom domain `photos.thite.site` pending a CNAME record). Redeploy any time with:

```sh
wrangler pages deploy . --project-name photos --branch main --commit-dirty=true
```

## Layout

- `index.html` — the photo app (grid, search, lightbox)
- `login.html` — password gate page
- `functions/` — Pages Functions: `_middleware.js` (auth gate), `api/login.js` (session cookie), `media/[[key]].js` (R2 proxy with Range support)
- `photos/` — local originals (gitignored; the live copies are in R2)
- `data/photos.json` — generated library index
- `scripts/build_library.py` — scanner that builds the index
- `scripts/add_photos.sh` — import → index → R2 → deploy in one command
- `assets/fonts/` — et-book, borrowed from thite.site

## Security model

- R2 bucket `photos-library` is private — no public URL, reachable only through the `PHOTOS` Pages binding
- Every route except `/login` requires a signed cookie (`HMAC-SHA256(expiry, password)`, 30-day expiry, HttpOnly + Secure)
- Password lives in the `PHOTOS_PASSWORD` Pages secret — never in the repo or client bundle
- Media keys are validated (no traversal, known extensions only)

To rotate the password: `wrangler pages secret put PHOTOS_PASSWORD --project-name photos` (existing sessions die immediately, since cookies are HMAC'd with the old password).

## Features

- Day-grouped grid ("Today", "Yesterday", …) with album hints
- Search across names, albums, dates
- Lightbox with keyboard nav (← → esc), video playback
- Zero dependencies; works on any static host
