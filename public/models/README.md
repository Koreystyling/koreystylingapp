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

## Personalisation calibration

Each view also has a body mask, `<view>-mask.png` (greyscale, white = person), made once with a background-removal model (BiRefNet on fal). The personalisation engine uses it to find the body outline and the bust, waist and hip lines.

Each model also needs body measurements in cm in `src/lib/engine/calibration.ts`. The pilot values are standard UK size-chart values for her dress size, and her height is assumed. For a real photoshoot, measure the model on the day and record the real values there. When you replace a photo, make a new mask for it too.
