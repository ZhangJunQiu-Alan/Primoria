# Viewer Live2D Model Spec

This folder is the source of truth for replaceable Live2D character models used by `viewer-react`.

The old `flat / layered PNG` approach is deprecated. New character work should be prepared as a **Live2D Cubism export package**.

## What This Means

For Live2D, a single transparent PNG is **not enough**.

To swap characters later without changing code, every character must arrive as a complete exported model package from Live2D Cubism.

## Folder Layout

```text
packages/viewer-react/public/live2d-models/
  README.md
  _template/
    viewer.live2d.example.json
  luna-guide/
    viewer.live2d.json
    preview.png
    LICENSE.txt
    luna-guide.model3.json
    luna-guide.moc3
    physics3.json
    pose3.json
    expressions/
      smile.exp3.json
      blink.exp3.json
    motions/
      idle.motion3.json
      tap.motion3.json
      greet.motion3.json
    textures/
      texture_00.png
      texture_01.png
```

## Minimum Required Files

Every replaceable Live2D model should include:

- `viewer.live2d.json`
- `preview.png`
- `LICENSE.txt`
- `<model-name>.model3.json`
- `<model-name>.moc3`
- at least one texture PNG in `textures/`

Without `model3.json + moc3 + textures`, it is not a runnable Live2D web model.

## Strongly Recommended Files

These are not always mandatory, but they are what you normally want for a usable character:

- `physics3.json`
- `pose3.json`
- one or more `*.exp3.json` files for expressions
- one or more `*.motion3.json` files for idle / tap / greet

## What Each File Does

### Live2D Runtime Files

- `<model-name>.model3.json`
  - main model manifest used by the web runtime
  - references moc, textures, motions, expressions, physics, pose
- `<model-name>.moc3`
  - compiled Live2D model data
- `textures/texture_00.png`
  - texture atlas images used by the model
- `physics3.json`
  - secondary motion such as hair / cloth / soft movement
- `pose3.json`
  - part visibility switching rules
- `expressions/*.exp3.json`
  - reusable expressions such as smile, blink, surprised
- `motions/*.motion3.json`
  - animation clips such as idle, greet, tap-body, tap-face
- `userdata3.json`
  - optional extra metadata, usually not required for the homepage use case

### Viewer App Files

- `viewer.live2d.json`
  - app-level placement and interaction settings for `viewer-react`
- `preview.png`
  - thumbnail for selection UI or asset review
- `LICENSE.txt`
  - source, author, and usage rights

## Required Export Source Files

These do not need to ship to the browser, but the artist or vendor should keep them:

- layered source PSD or equivalent source art
- Live2D Cubism project file:
  - `.cmo3`
- optional animation scene file:
  - `.can3`

If you are buying or commissioning a Live2D model, ask for these source files in addition to the exported web package.

## Replaceable Model Rule

To keep character replacement simple, every model folder should follow these rules:

- one model per folder
- folder name uses lowercase kebab-case
- one exported `model3.json` at the folder root
- textures live in `textures/`
- expressions live in `expressions/`
- motions live in `motions/`
- every model includes `viewer.live2d.json`

Example folder names:

- `luna-guide`
- `robot-helper`
- `astro-student`

## Viewer Placement Contract

`viewer.live2d.json` is the app-specific layer that keeps replacement easy even if the Live2D internal file names differ.

Recommended fields:

- `id`
- `name`
- `model`
- `preview`
- `defaultScale`
- `anchor`
- `placement`
- `interactions`
- `motions`
- `expressions`

## Suggested Homepage Interaction Set

For the current homepage hero, keep interaction light:

- `idle`
  - default looping motion
- `hover`
  - mild head / body reaction if supported
- `tap`
  - one short greeting or wave
- `lookAtPointer`
  - only if the model supports it and it feels subtle

Do not start with a heavy VTuber-style character on the homepage. Keep it calm and product-like.

## File Checklist To Request From An Artist Or Asset Vendor

If you want a model that can be swapped later, ask for this exact bundle:

1. Live2D Cubism web export package
2. `model3.json`
3. `moc3`
4. all referenced texture PNGs
5. all referenced motion files
6. all referenced expression files
7. `physics3.json`
8. `pose3.json`
9. source PSD
10. Cubism project `.cmo3`
11. usage license in writing

## Licensing Note

Do not assume a downloaded Live2D model is safe for product use.

For every model, keep:

- source URL
- author or studio
- license type
- whether commercial use is allowed
- whether editing is allowed
- whether redistribution is allowed
- whether attribution is required

Record that in `LICENSE.txt`.
