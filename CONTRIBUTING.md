# Contributing

The one rule: **a number that is not traceable does not ship.** A change is good if the gate gets harder to fool, a model gets more recognisable, or an object gets a stronger verification.

## Setup

Node 22+ and a Chromium browser (Edge or Chrome) are enough to check and preview. ffmpeg is needed only to render videos. No install step: the kit is plain files.

```
npm run test:fast                                 # about 2 s, no browser or ffmpeg: the gate, DEFLATE / RAR5 against zlib, 2D geometry, versions, sound engines
npm run lint                                      # syntax, line endings, indentation, line length (no dependencies); a file may not gain lines over 200 characters
npm run test:coverage                             # the fast tests with coverage of kit/ and scripts/; fails under 82 % branches or 85 % functions
npm run check:all                                 # the gate on every examples/*/spec.js, as CI runs it
npm test                                          # everything, including the headless-browser, ffmpeg and golden-frame tests (needs both, takes a long time)
BROWSER_TIMEOUT_SCALE=4 npm test                  # the same on a slow machine (software WebGL, 2 cores): every browser watchdog is 4x longer
node scripts/check-spec.mjs examples/hub/spec.js  # one example's gate
node scripts/stranger.mjs rubik                   # label-free still for the stranger test
```

Long lines only go down: `scripts/lint-baseline.json` records how many lines over 200 characters each file has today, and the lint fails if a file gains one. When you shorten some, run `node scripts/lint.mjs --update-baseline` and commit the new baseline. Specs run contained under Node's permission model (see SECURITY.md); pass `--trusted` only for a spec you wrote yourself.

## Adding an object

1. `node scripts/new.mjs my-object --title "My object"` creates a draft. It fails the gate on purpose.
2. Research it. Every number needs a source you actually opened (URL, fetch date). MEASURED claims state their error, DERIVED claims their cross-check, ESTIMATED claims why nobody publishes them.
3. Make the model compare itself with something published (a ratio, a CRC, a byte count, a test vector). A model that compares nothing is NOTHING CHECKED.
4. Declare `recognize` and run the stranger test. Record the result, including a failure.
5. `npm test` and `npm run check:all` must pass. Do not commit `out/`.
6. The project page plays 720p copies of the films from the `media` release, not from the repository (`docs/media/video/` is ignored). Make them with `ffmpeg -i out/<name>.mp4 -vf scale=720:-2 -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k docs/media/video/<name>.mp4` (the same for `<name>-short.mp4`) and upload them with `gh release upload media docs/media/video/<name>.mp4 --clobber`. Posters (`docs/media/poster-<name>.jpg`) and GIFs stay in the repository.

## Versions

- `package.json` is the version of the full Mechanism plugin; `.claude-plugin/plugin.json` repeats it.
- Each plugin under `plugins/<name>/` has its own version, written once in its `skill.json` and repeated in its `.claude-plugin/plugin.json`; `scripts/build-skill.mjs` copies it into `files.json`. A sub-plugin's version moves on its own.
- Versions change only when a release is made; until then changes go under `## Unreleased` in `CHANGELOG.md`.
- Links in the plugin manifests (`homepage`, `repository`) point at the repository, not at a folder of a branch, so they never lead to a page `main` does not have.
- `tests/versions.test.mjs` checks all of the above, and that the marketplace lists every plugin at a folder that exists.

## Changing the gate

Add the failing case to `tests/gate.test.mjs` first. A false positive (a bad spec that passes) is a bug; so is a false negative on a shipped example.

## Licences

Everything is MIT. Audio samples and third-party material are listed in THIRD_PARTY.md; do not add anything whose licence is not recorded there. No copied logos or brand art: describe the shape and mark the colours ESTIMATED.
