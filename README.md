# Baseball Study Hub (open edition)

A free, browser-based study hub for baseball strength and conditioning and
sports science: lessons, recall practice, a joint range-of-motion explorer,
pitching and hitting breakdowns, and a 3D sports-anatomy lab.

Built by Mauro Castillo (CSCS, RSCC, CPSS). Educational use only. Not medical advice.

## Use it

Live site: https://maurocastillomd.github.io/baseball-study-hub-open/

## Feedback

Found a mistake or have an idea? [Open an issue](https://github.com/maurocastillomd/baseball-study-hub-open/issues/new/choose).
See `CONTRIBUTING.md`. Lessons were drafted with AI tools from cited sources and are still being
checked, so corrections with a source are especially welcome.

## Run it yourself

It is a static site. From this folder:

```
python3 scripts/server.py      # or: python3 -m http.server -d app 8000
```

Then open http://localhost:8000. Progress is saved in your browser only.

## Host it

This repository deploys itself to GitHub Pages on every push (`.github/workflows/pages.yml`).
Any other static host works too: publish the `app/` folder. Device sync is not included in the
open edition; it needs your own Worker, database and Cloudflare Access.

## Licences

- Code: MIT (`LICENSE`)
- Lesson text, data and original graphics: CC BY 4.0 (`LICENSE-CONTENT.md`)
- Third-party models, fonts and libraries keep their own licences (`THIRD_PARTY_NOTICES.md`)
