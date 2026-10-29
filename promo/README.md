# Primoria — A Drop of Ink

Standalone Remotion 4 film project. **Current direction: DirectionStudy v02**,
an 18-second visual proof based on the user's reference
[Meet Kimi K3](https://www.youtube.com/watch?v=bn0atstgavo). The earlier phase-0
animatic was rejected aesthetically and is retained as a superseded draft.
The new proof uses finished-direction product illustrations instead of shot
description slides. It is not the complete 90-second film or a live recording.

```sh
pnpm render:direction
```

The `DirectionStudy` composition shows a physical learning-material collage,
question composer, dimensional knowledge network, wave experiment, course and
Tutor close-up, and brand ending. Its graph exports real concept names and
prerequisite edges from two source graphs: 62 concepts, with an 11-concept
Transformer closure. Layout is an artistic visualization, not a product UI claim.
The wave example implements equal-frequency superposition with a changing phase
offset. The accompanying 120 BPM synth score is composed procedurally without
third-party samples or paid services. Details: [creative direction v02](CREATIVE-DIRECTION-V2.md).

The commands below also preserve the original animatic workflow for reference.

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
