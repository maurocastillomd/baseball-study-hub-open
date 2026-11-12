# Baseball Study Hub (open edition)

A free, browser-based study hub for baseball strength and conditioning and
sports science: lessons, recall practice, a joint range-of-motion explorer,
pitching and hitting breakdowns, and a 3D sports-anatomy lab.

Built by Mauro Castillo (CSCS, RSCC, CPSS). Educational use only. Not medical advice.

## Run it

It is a static site. From this folder:

```
python3 scripts/server.py      # or: python3 -m http.server -d app 8000
```

Then open http://localhost:8000. Progress is saved in your browser only.

## Host it

Any static host works (Cloudflare Pages or Workers static assets, GitHub
Pages, Netlify). Publish the `app/` folder. Device sync is not included in the
open edition; it needs your own Worker, database and Cloudflare Access.

## Licences

- Code: MIT (`LICENSE`)
- Lesson text, data and original graphics: CC BY 4.0 (`LICENSE-CONTENT.md`)
- Third-party models, fonts and libraries keep their own licences (`THIRD_PARTY_NOTICES.md`)
