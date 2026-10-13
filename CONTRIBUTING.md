# Contributing

The one rule: **a number that is not traceable does not ship.** A change is good if the gate gets harder to fool, a model gets more recognisable, or an object gets a stronger verification.

## Setup

Node 22+ and a Chromium browser (Edge or Chrome) are enough to check and preview. ffmpeg is needed only to render videos. No install step: the kit is plain files.

```
npm test                                          # gate regression tests + the DEFLATE and RAR5 models against zlib
node scripts/check-spec.mjs examples/hub/spec.js  # one example's gate
node scripts/stranger.mjs rubik                   # label-free still for the stranger test
```

## Adding an object

1. `node scripts/new.mjs my-object --title "My object"` creates a draft. It fails the gate on purpose.
2. Research it. Every number needs a source you actually opened (URL, fetch date). MEASURED claims state their error, DERIVED claims their cross-check, ESTIMATED claims why nobody publishes them.
3. Make the model compare itself with something published (a ratio, a CRC, a byte count, a test vector). A model that compares nothing is NOTHING CHECKED.
4. Declare `recognize` and run the stranger test. Record the result, including a failure.
5. `npm test` and `node scripts/check-spec.mjs examples/my-object/spec.js` must pass. Do not commit `out/`.

## Changing the gate

Add the failing case to `tests/gate.test.mjs` first. A false positive (a bad spec that passes) is a bug; so is a false negative on a shipped example.

## Licences

Everything is MIT. Audio samples and third-party material are listed in THIRD_PARTY.md; do not add anything whose licence is not recorded there. No copied logos or brand art: describe the shape and mark the colours ESTIMATED.
