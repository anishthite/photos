# photos

A Google Photos-style library, in the style of [thite.site](https://thite.site) — et-book serif, paper background, day-grouped justified grid, lightbox viewer, and simple search. Plain static HTML/JS, no build step.

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

- `index.html` — the whole app (markup, styles, viewer)
- `photos/` — your originals (gitignored contents)
- `data/photos.json` — generated library index
- `scripts/build_library.py` — scanner that builds the index
- `assets/fonts/` — et-book, borrowed from thite.site

## Features

- Day-grouped grid ("Today", "Yesterday", …) with album hints
- Search across names, albums, dates
- Lightbox with keyboard nav (← → esc), video playback
- Zero dependencies; works on any static host
