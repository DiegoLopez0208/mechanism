## What changes

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `npm run lint` and `npm run test:fast` pass
- [ ] If the gate changed: the failing case was added to `tests/gate.test.mjs` first
- [ ] If an object changed: `node scripts/check-spec.mjs examples/<object>/spec.js` still gives the verdict the README states
- [ ] If `kit/` or `scripts/` changed: `node scripts/build-skill.mjs draft` was run (the Draft plugin copy matches)
- [ ] Every new number says where it came from (SPEC, MEASURED, DERIVED or ESTIMATED), with a source I opened
- [ ] Heavy media (`out/`, videos) is not committed
