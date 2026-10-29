# Primoria — From a question to understanding

**Current review: `LaunchFilm` v03, 90 seconds, 1920 × 1080, 30 fps.**
The user accepted the v02 visual direction and authorized expansion on
2026-10-29. The complete picture cut covers a question, source-derived
knowledge network and prerequisite path, wave superposition, thin-lens imaging,
three Tutor styles, material-grounded Q&A, practice and mastery, subject
coverage, and the Primoria ending.

```sh
pnpm launch:prepare   # source data + original 90-second score
pnpm launch:stills
pnpm render:launch
pnpm verify:launch
```

Product screens are art-directed illustrations. Lecture names, excerpts,
citation page numbers, practice history and Tutor replies are scripted examples,
not a captured user session. The graph exports real names and prerequisite
edges: 62 concepts, including an 11-concept Transformer prerequisite closure.
No lesson grouping count is promised. Mastery appears after three correct first
attempts, consistent with the minimum-three / 80% rule. The catalog contains 49
components; runtime registration of 31 graphs is separate from source approval.

The film uses short English labels and an original 120 BPM stereo score,
normalized to -18 LUFS / -1.5 dBTP. It has no spoken narration. No reference
footage, reference audio, paid API, or third-party music sample is used.

## Flicker repair

The v02 encoded MP4 contains intermittent repeated tiles, confirmed in decoded
consecutive frames (for example frames 27–29 and 40–42). These are corrupted
raster frames, not intended film grain. Single-frame spot checks had missed
them. A 70-frame software ANGLE probe at the same scene eliminated the tile
repetition. A second 70-frame 1080p probe passed with ANGLE and GPU rasterization
disabled, but the full 90-second render still contained damaged frames. The
installed renderer enables shared-memory capture by default; this bypasses the
PNG screenshot setting. The final capture path disables shared-memory capture
and uses ordinary PNG screenshots. GPU rasterization remains disabled in the
Mac wrapper. Other platforms default to software ANGLE. The wrapper changes
only this render process. The launch command uses one worker: a parallel PNG
capture probe stalled, while the single-worker 270-frame sequence passed its
continuous-frame scan. A short probe is insufficient to accept a full export.

`verify:launch` decodes all 2,700 video frames and checks resolution, codec,
frame rate, duration, audio sample rate and temporal discontinuities. It writes
a report next to the MP4. This scan catches the large transient corruptions
seen in v02; it is separate from visual review and does not establish artistic
acceptance. Keep old v02 MP4s only as superseded evidence.

Final v03 verification on 2026-10-29: all 2,700 frames decoded; zero temporal
outliers above the threshold; 1920 × 1080 / 30 fps / H.264 / AAC 48 kHz / 90.005s.
Ten scene samples were extracted from the encoded MP4 and visually reviewed.
Encoded audio measures -17.7 LUFS integrated, with -4.2 dBFS true peak.
Reports, the final contact sheet and rejected-capture diagnostics are local in
`out/`. These checks establish export integrity, not user approval of the edit.

## Earlier drafts

`DirectionStudy` preserves the 18-second accepted visual proof with the
render/label repairs. The original `PromoFilm` composition is the rejected
phase-0 animatic and remains for reference. The original animatic workflow
below does not describe the current launch film.

## Setup and preview

```sh
cd promo
pnpm install --ignore-workspace
pnpm vo:scratch
pnpm vo:measure
pnpm audio:beat
pnpm studio
```

Studio runs on port 3100. Select `PromoFilm` for the whole film, `Act1`–`Act6`
for individual acts, or `Stills` for frames without captions.

This directory is deliberately excluded from `pnpm-workspace.yaml` and Docker.
Install inside this directory with `--ignore-workspace`; its lockfile is local.
No production code is imported. Palette and logo are copied from Primoria.

## Verification and rendering

```sh
pnpm check
pnpm verify:frames    # render six sample frames twice and compare PNG hashes
pnpm render:animatic  # 960 × 540 / 30 fps, first review checkpoint
pnpm verify:render    # check the encoded streams and all 16 shot midpoints
pnpm render           # 1920 × 1080 / 30 fps; still animatic until later stages
pnpm stills           # all 16 shot frames, 1920 × 1080
pnpm exec remotion render src/index.ts PromoFilm out/no-captions.mp4 --props='{"captions":false,"music":false}'
```

Render output is H.264, CRF 16, yuv420p, with AAC audio. The source narration is
48 kHz WAV. `out/render-report.json` records duration and render time.
On macOS, the config prefers an installed Google Chrome for rendering because
the first Headless Shell launch timed out in this session. Override with
`PROMO_BROWSER_EXECUTABLE=/absolute/path/to/chrome` when needed; otherwise
Remotion uses its matching Headless Shell. Rendering uses two workers to limit
memory pressure on the current 8 GB Mac.
`verify:frames` uses software ANGLE for stable rasterization: the initial GPU
comparison had 1–2-level differences around antialiased edges. It compares
identical PNG bytes at six frames, including S06 and both scenes after ink transitions.
The MP4 uses explicit ANGLE plus pre-generated paper and 24 grain PNG textures
(regenerate with `python3 scripts/build-textures.py`). The initial default-GPU
export with live SVG noise exhibited partial repeated tiles; a seven-second
ANGLE probe of the affected S06 scene confirmed the revised path is visible and
correct. A software-only full-film attempt was stopped because it was too slow
on this Mac. Software still-frame identity remains a separate verification gate.

The only time source is `src/timeline.ts`: shot duration is the greater of the
storyboard minimum and measured narration plus offset/tail. Custom ink
transition overlaps are accounted for in both sequences and absolute audio
positions. All visual motion depends on frame numbers and fixed constants.
The phase-0 ink transition uses a seeded irregular radial clip; replace it with
the final ink treatment during the visual pass. Completed transitions remove
their clip entirely so subsequent shots remain visible.

## Narration and captions

`src/data/vo.ts` contains all text, offsets, and caption chunks. VO12 is scoped
to material-grounded answers rather than promising citations for every answer.
Temporary voice: macOS Samantha, rate 165. The brand pronunciation is provisional.

Replace `public/vo/VO01.wav`–`VO13.wav` with the final voice, then run:

```sh
pnpm vo:measure
pnpm audio:beat
pnpm check
pnpm render:animatic
```

Captions are limited to two lines of 42 characters and timed across the measured
utterance by phrase word count. They are suitable for animatic review, not
word-aligned final captions. Refine phrase timing against the selected final
narration during the sound pass. Files under `public/vo/` are local and ignored;
the scratch script recreates them from source.

## Music and licenses

No purchased service or paid API is used. No final music is currently installed.
With `music: true`, the preview uses a quiet, self-generated 100 BPM click during
Act 4; `music: false` mutes both the click and any future score.
The click is a timing reference, not final music.

When licensed music is selected, put it at `public/music/score.mp3`, record its
license and attribution, and revise `BPM` and `beatOffsetFrames`. The film uses
12 dB of music ducking around voiceovers. Free candidates and required credits:
[resource register](../docs/promo-video-resources.md).

Downloaded Mixkit source audio must remain local, excluded from public source
distributions. Final effects have not been downloaded. Paper/grain effects and
the preview click are procedural. Google Fonts supplies Newsreader, Geist, and
Geist Mono through `@remotion/google-fonts`; local fonts can replace network
loading before final offline delivery.

Remotion's official license permits free use by individuals and companies of up
to three people. Larger organizations require an appropriate license. This work
is prepared as the requested coursework presentation; company use/eligibility
must be resolved before reuse on behalf of a larger organization. See
[current pricing and eligibility](https://www.remotion.dev/docs/license/pricing).

## Truthfulness and next checkpoint

`check:claims` reads the source graph inventory, component catalog, Tutor style
ids and actual mastery-rule constants. It fails when the expected 31 / 49 /
3 answers / 80% claims drift. A render includes this check.

The placeholder map is a visual schematic. The specific Transformer closure,
cross-graph scope, and lesson grouping are **not verified yet**, and are not
presented as actual generated output. Phase 1 must export real source nodes and
try the actual concept-frontier grouping before producing the hero sequence.
The shot descriptions preserve the handoff's intended story while avoiding a
single-answer mastery claim or an implied original-PDF viewer.

The handoff explicitly requires approval after phase 0. Show the complete
animatic and confirm pacing/narration before phase 1. Do not treat animatic
approval as approval of the final visuals, factual closure or final audio.
