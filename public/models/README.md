# Korey model library assets

One folder per model, named by the model's id in `src/lib/models.ts`:

```
public/models/<id>/front.webp   required
public/models/<id>/side.webp    optional (right side, facing the viewer's left)
public/models/<id>/back.webp    optional
public/models/<id>/thumb.webp   240 x 360 crop of the front, for pickers
```

Photo spec (all views of one model must match):
- Full body, head to toe, with space above the head and below the feet. Portrait 2:3, at least 848 x 1264.
- Plain light warm-grey seamless backdrop, soft even studio light, no props or text.
- Simple fitted plain charcoal sleeveless knee-length dress and nude flat sandals, so the body shape reads clearly and the try-on model has a clean base.
- Natural standing pose, arms slightly away from the body, feet hip-width apart. Camera at waist height.
- WebP, quality about 84.

Every entry records `source` (`ai-pilot`, `photoshoot` or `licensed`) and a `credit`. The five pilot models (adaeze, temi, halima, ifeoma, bisola) are AI-generated fictional people made for the pilot. Replace them with released photoshoot images before launch by dropping new files into the same folders and changing `source`.
