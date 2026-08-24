# photos

A Google Photos-style library, in the style of [thite.site](https://thite.site) — et-book serif, paper background, day-grouped justified grid, lightbox viewer, and simple search. Plain static HTML/JS, no build step.

## Use it

1. Drop images/videos into `photos/` (subfolders become album labels).
2. Build the library index:

   ```sh
   python3 scripts/build_library.py
   ```

   Install `pillow` if you want EXIF dates (`pip install pillow`); otherwise file mtimes are used.

3. Serve and open:

   ```sh
   python3 -m http.server 8000
   # → http://localhost:8000
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
