# Korey

See the outfit on them before the first cut. A web app for Nigerian/Owambe stylists and their clients:
mix parts from style pictures, set where the top and skirt end, design the back, drop in the real fabric,
add gele and accessories, then send the tailor a card with exact measurements.

## What is in this MVP

- **Home**: your looks, who are we dressing, coming-up events (phone, tablet, laptop layouts).
- **Look builder** (8 steps): Person (photo upload or default model sizes 10-20), Size (cm/in, exact numbers),
  Style (mix top/sleeves/skirt/back from built-in or uploaded front and back pictures), Shape (tap or drag on the
  model to set the top and skirt lines, presets, peplum), Back (5 designs, upload a back picture, notes),
  Fabric (upload a fabric photo, per-part fabric, 14 colours plus custom for base and beads), Accessories
  (gele, shoes, bag, jewellery, all optional, upload your own, custom colours), Share.
- **Views**: front, back, side, and a GSAP spin-around you can also drag.
- **Tailor card**: drawing in three views, measurements, plain-English "what to sew", source pictures. Opens from a
  share link with no login (the look is encoded in the link).
- **Stylist studio**: white-label brand (logo, name, colours, WhatsApp, Instagram, page name), catalogue (upload work,
  tag by part, filter), clients (add, event dates, start a look for a client).
- **Realistic try-on**: "Make it realistic" sends the person's photo and the drawn look to `api/tryon.ts`, which calls
  fal.ai Nano Banana Pro image edit, guided by a prompt built from the look (silhouette, length, fabric), with Seedream and FASHN as backups. The key stays on the server.

Stack: Vite, React 18, TypeScript, Framer Motion (UI motion), GSAP (spin view). Data is kept in the browser for now
(`src/lib/store.tsx`); the PRD's Supabase backend replaces that one module.

## Run it

```bash
npm install
npm run dev            # local dev server
npm run build          # static site in dist/ (deploy to Vercel; api/tryon.ts becomes the function)
npm run build:single   # one self-contained HTML file in dist-single/ for quick previews
```

Try-on locally: create `.env.local` with `FAL_KEY=...` and `VITE_TRYON_ENDPOINT=/api/tryon`, then restart `npm run dev`. The dev server runs `api/tryon.ts` itself, so the key stays on your machine and out of the browser.

Deploy on Vercel: import the repo, set `FAL_KEY` (server) and `VITE_TRYON_ENDPOINT=/api/tryon`, deploy.

## Known gaps (next)

- Accounts, cloud saving and photo storage (Supabase). Uploaded photos are not in share links yet.
- Paystack billing and real credit metering (credits are a counter for now).
- AI reading of uploaded style pictures (today the user picks the closest shapes).
- Real try-on images need fal credit on the account.

## Model library

The builder shows a photographic model instead of the old drawn figure. Models are defined in `src/lib/models.ts` (id, name, skin tone, body shape, UK size, views, source) with photos in `public/models/<id>/` (spec in `public/models/README.md`). Looks save `modelId`. The drawn SVG remains only as the garment sketch (stage inset, Shape step, tailor card, style thumbnails). `personImageFor()` gives the try-on the customer's photo, or the selected model's photo for the view. The five pilot models are AI-generated fictional people, marked `source: 'ai-pilot'`, to be replaced by a released photoshoot.
