#!/usr/bin/env bash
# Assembles out/frames/frame-{1..4}.png into docs/images/fix-demo.gif with a
# two-pass palette (palettegen, then paletteuse). Run capture.mjs first.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
FFMPEG="${FFMPEG:-ffmpeg}"
FRAMES="$HERE/out/frames"
OUT="${1:-$ROOT/docs/images/fix-demo.gif}"

# Seconds each frame stays on screen.
DURATIONS=(4 4 4.5 4.5)

LIST="$HERE/out/frames.txt"
: > "$LIST"
for i in 1 2 3 4; do
  printf "file '%s'\nduration %s\n" "$FRAMES/frame-$i.png" "${DURATIONS[$((i - 1))]}" >> "$LIST"
done
# The concat demuxer ignores the last duration unless the last file repeats.
printf "file '%s'\n" "$FRAMES/frame-4.png" >> "$LIST"

"$FFMPEG" -v error -y -f concat -safe 0 -i "$LIST" \
  -vf "palettegen=max_colors=256:stats_mode=full" -update 1 -frames:v 1 "$HERE/out/palette.png"
"$FFMPEG" -v error -y -f concat -safe 0 -i "$LIST" -i "$HERE/out/palette.png" \
  -lavfi "[0:v][1:v]paletteuse=dither=sierra2_4a" -fps_mode vfr -loop 0 "$OUT"

ls -l "$OUT"
