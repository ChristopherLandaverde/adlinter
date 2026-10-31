# README demo GIF

Builds `docs/images/fix-demo.gif`, the four-frame storyboard at the top of the README, from the running app:

1. The bundled Google Ads Linter sample (`public/samples/ads-conversions-sample.csv`) with the Purchase row that counts "One" highlighted, beside the tool screen.
2. The real audit result for that sample: score, checks passed, severity counts, most critical findings.
3. The Wrong Counting Method finding and its `/checks/wrong-counting-method` explainer.
4. A real re-run: the script writes a copy of the sample with one cell changed (Purchase, Count, One to Every), uploads it through the tool's file input, and screenshots the new result.

Every number and finding title in the captions is read from the pages during the run and recorded in `run.json`. The script throws if the app stops showing what the captions describe (for example, if the counting-method findings no longer fire on the sample, or still fire on the fixed copy), so update the captions in `capture.mjs` when that happens.

| File | Role |
|---|---|
| `capture.mjs` | Drives the app with Playwright, writes the screenshots to `out/shots/`, the record to `run.json`, and renders the frames to `out/frames/` |
| `frame.html` | Stage and card styles for the frames (DESIGN.md tokens on a navy stage, fonts from Fontshare as in `app/layout.tsx`) |
| `build-gif.sh` | Two-pass palette ffmpeg assembly of `out/frames/` into the GIF |
| `run.json` | What the app showed in the last capture |

## Regenerate

Playwright is not a dependency of the app. Install the pinned version without saving it, plus ffmpeg:

```bash
npm ci
npm i --no-save playwright@1.62.0
npx playwright install chromium        # skip if Chromium for 1.62.0 is already installed
npm run build && npx next start -p 3000 &
node scripts/readme-demo/capture.mjs   # BASE_URL=http://localhost:3000 by default
scripts/readme-demo/build-gif.sh       # FFMPEG=/path/to/ffmpeg if it isn't on PATH
```

Look at every frame in `out/frames/` before committing. The GIF is 880 x 640, 4 to 4.5 s per frame, and should stay under 3 MB.
