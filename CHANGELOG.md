# Changelog

## Unreleased

- Gate disclosures: displayed calculations without published comparators, tooth counts outside meshing links, and unknown spec/part keys now warn. Part cards and the register distinguish confidence from size comparisons, including which dimensions remain unchecked. These warnings do not change VERIFIED/CONSISTENT or count unchecked calculations as reproduced figures.
- Browser lifecycle: shared port-zero CDP sessions, private profiles, bounded operations/frame watchdogs, one retry for watchdog failures, and cleanup of the owned PID tree on failure or interruption. All five browser scripts use the helper.

## 0.8.1 - 2026-10-16

The gate stops agreeing with itself, and the site gets a face.

- **Gate: provenance.** Every published-figure check is now classified as independent (the source of the published figure differs from the sources of the inputs), same source, or with no sourced inputs, and the verdict says so (`provenance:` line, a warning). **VERIFIED now needs at least one independent check; when none is, the state is the new CONSISTENT** (the film's stamp, the badges and the register follow). A source can say it derives from another (`derives: [ids]`) and then counts as the same. Measured on the 11 examples and the two agent runs: the lock becomes CONSISTENT (all its figures come from one page, Lockwiki) and so would the Antikythera run (its six checks share a source with their inputs); the floppy, the RTX 4090, the hub, rar5, react and the rest keep VERIFIED.
- **Gate: captions.** A quantity typed in a part card or in the lead text of the film (a decimal or a number with a unit) must be traceable to a claim, a dimension, a position or a published or computed value (mm, in and cm conversions and 0.3 % rounding allowed), or the gate warns. Bare integers are ignored. On the examples it finds two cases, both typed derived values: the hub's sprocket pitch radius (36.5 mm, the formula gives 36.57) and WinRAR's 41 %.
- **Site: a mark of our own and a splash screen.** The mark is a gear drawn solid on the left and dotted on the right (what is published is solid, what is estimated is dotted and said so); it replaces the gear emoji as the favicon and the symbol in the nav, there is a 1200 x 630 card for shared links, and a splash that plays once per session (opacity and transform only, because the main thread is busy for about 3 s starting the 3D hero; it waits for the page to load, can be skipped with a click or a key, and is skipped for deep links, `?nosplash` and reduced motion).
- **Site: nav.** The link is "Runs", labels no longer wrap, and between 761 and 1120 px the look switches are no longer cut off (already broken on the published page).
- **Site: video URLs carry a version** so a browser does not keep an old copy of an asset that was replaced under the same name.
- **Films:** the lock, the hub and WinRAR were re-rendered: the lock's stamp now says CONSISTENT, the hub's sprocket card says 36.6 mm (the formula gives 36.57, the card said 36.5) and WinRAR's 41 % is in a claim.
- **Benchmark notes:** a dated addendum with what today's gate says about each agent run, without rewriting what was published before.

## 0.8.0 - 2026-10-16

The first two unassisted agent runs, a visual preflight, and the toolkit problems those runs found.

- **Agent runs** (`docs/benchmark/`): the 3.5-inch floppy disk and the Antikythera mechanism, each modelled by a fresh agent with only the skill. The criteria were fixed before the results; the logs keep every failure. Antikythera passes the gate but was not recognised by a blind judge; the floppy was. One run is one data point.
- **Visual preflight** (`scripts/preflight.mjs`): steps through the whole timeline without rendering an MP4 and reports a camera inside a part, parts or the object out of frame, texts that overlap or run past the edge, and flat parts whose mesh does not cover its outline. A diagnostic: it exits 0 unless `--strict`.
- **Gate:** a dimension whose unit differs from its claim's (10 cm against a claim of 10 mm) now fails before rendering; two gears of different size on one body is an error with the advice (one body per gear plus `same` links), where it used to take the first gear's teeth silently.
- **Toolkit:** `plate` takes rectangular holes and `profile` takes polygon holes; `stranger.mjs` works on any page and saves the still under a neutral name; `new.mjs` accepts a folder that already holds a log; `render.mjs` prints the film length and the wall time apart.
- **Films:** long texts now fit the frame in the panels and the intro card (30 preflight warnings on the normal cuts became 12, none of them a failure); the receipt of the lock fits its ten rows; the K20A shots no longer spill past both sides; the RTX 4090 has its rear fan past the end of a shorter board (cited to a review) and 60 parts instead of 66. The affected films were re-rendered.
- **Skill:** sources that are scans, the preflight step, one tooth count per body, renders in the background, and a note that anything on a part that fades needs the same `cutaway`.
- **Site:** a section for the agent runs, video URLs with the release version so a browser does not keep an old copy, and the lists brought up to date.

## 0.7.0 - 2026-10-14

A film about React, and every film re-rendered with the new look.

- **All films re-rendered** with the new look (auto-framing, softer metal, closing card with the name and the verdict), plus two fixes found by reading every cut: the camera no longer flies through the shell between tour stops (the frame went white on the RTX 4090), and a published value too wide for its panel (the Rubik's cube 43,252,003,274,489,856,000) now shrinks instead of printing over its label.
- **Skill: "Explain what it is first".** A film has to say what the object is and what it does in plain words, and the stranger test is the check. `examples/react` was rebuilt on that rule.
- **React** (examples/react): software in motion. One click on a Counter component, followed through the real React 18.3.1 in jsdom: the component runs again, React compares old and new output, and exactly one of eight DOM nodes is touched. `kit/react-reconcile.js` (`diff` for a component's output, `reconcile` for keyed lists) is written from the published reconciliation rules; `scripts/make-react-sample.mjs` records the real behaviour with a MutationObserver. Gate: 3 reproduced, 1 estimated; stranger test names React (90 / 92).
- **Site on phones.** A Playwright pass (iPhone 13, Pixel 7, Edge) found that the look and 30 s / Full switches were clipped off screen on 390 px, the hero hint was cut, the card links (Viewer, GLB, spec.js) were 18 px high and the example pages asked for a favicon that did not exist. Fixed. No horizontal scroll, no console errors, videos play at 720x900 and the viewers draw.

## 0.6.0 - 2026-10-13

The pre-launch release: audited, faster to render, lighter to install.

- **Audit.** Two read-only audits (secrets, personal data and licences across the tree and all 34 revisions; a code-level security review). No secrets, no personal data, no local paths. Fixed what they found: `SECURITY.md` and `SKILL.md` now say plainly that the gate is not a sandbox (a spec is code: read it before running it, or use `node --permission` or a container); `registry.mjs` only accepts well-formed object names and escapes every id; the CI token is read-only; `.gitignore` covers render leftovers; the checksum of the vendored three bundle is in `THIRD_PARTY.md`.
- **Faster renders.** Headless Edge was drawing on the integrated GPU. `render.mjs`, `probe.mjs` and `stranger.mjs` now ask for the high-performance GPU: a blurred frame went from 289 to 86 ms, a 30 s film from 155 s to 92 s on the test machine (a laptop with an integrated and a discrete GPU).
- **Lighter install.** A partial sparse clone is 4 MB instead of 85 MB or more (the repository keeps the films and the site; the skill does not need them). The command is in the README.
- **Refined from fresh-session tests.** Three sessions with no context installed the skill and modelled a Lenovo Legion 5 and a Game Boy. They found: the skill told agents to write inside its own folder (not allowed under `.claude/skills/`): now `new.mjs --dir <work>` and a SKILL.md that works in the user's project; unit conversions counted as evidence: the verdict now says ONLY CONVERSIONS and does not count them; `sqrt` and friends work in calc expressions; and an agent ran `taskkill /IM node.exe`, so SKILL.md now forbids stopping processes by name. SKILL.md starts with an eight-step quick start and ends with a final-report format.
- **Linux.** Tried from scratch on Ubuntu 24.04 (WSL2, no Node, ffmpeg or Chrome installed beforehand, normal user): the README install, the 33 tests, the gates of all ten objects, stills and the film lint pass. Rendering a film without a GPU takes about 7 s per frame, so the README says to render where there is one.
- **Compound gears.** A pinion and a wheel on one shaft (every watch train, every gearbox) no longer break the tooth-phase solver: each mesh component is solved from its own root and checked as strictly as before. A fourth fresh session modelling the ETA 2824-2 movement found it and patched the kit locally; the same spec now passes with the stock kit. Speed-bar labels are per drive (`drive.outLabel`) and show decimals below 10 rpm.
- **Film lint.** `scripts/lint-film.mjs` renders one draft frame per phase and tour stop and reports EMPTY / LOOK / SMALL before the render. It found a real defect in the hub film (the planet gear stop aimed at an empty spot): fixed and re-rendered.
- Social preview image (`docs/social-preview.png`).
- 30 tests, now including the lock and a tampered key pin.

## 0.5.0 - 2026-10-13

- **Pin tumbler lock** (examples/lock): the Kwikset KW1 keying table cross-checked (pin + cut depth = .501 in for all six heights, within .003 in of the plug diameter), the right key aligns five splits on the shear line, a wrong key blocks the plug, MACS respected; blind test recognised by two judges.
- Engine: `kind: profile` (a polygon extruded: key blades, cams), `motion(step, t, phase)` so a phase can show a different case, and a fix: a part hidden with scale 0 now comes back when its motion stops asking for a scale.
- 29 tests, now including the lock.

## 0.4.0 - 2026-10-13

- **Three lengths.** `--length short|normal|extended` (and `?length=`, `director.length`, `director.short`): the short cut is about 30 s (verdict panel only, two tour stops, three phases), the extended one adds longer phases and a longer tour. Short cuts of the nine checked objects are on the page (30 s / Full switch).

## 0.3.0 - 2026-10-13

- **Provenance per dimension.** `part.params` (value, unit, conf, claim, tolerance, why): the gate compares drawn sizes with their sources, counts them as reproduced figures and reports mixed parts. The Cherry switch uses it (footprint and cutout sourced; walls, spring and stem arms estimated).
- **Register.** `scripts/registry.mjs` writes docs/registry.html, registry.json and an SVG badge per object from the gate output.
- Viewer: GUESSES and BREAK IT. Plain sentence and legend in the films (`director.what`, `director.legend`).

## 0.2.0 - 2026-10-13

- **Gate.** Rejects placeholder sources and claims (example.com, TODO), non-positive or non-finite dimensions, specs with no parts, calculated variables with no claim, expressions that give undefined / NaN / Infinity, invalid tolerances and ESTIMATED parts with no reason. New drafts from new.mjs fail until completed.
- **Verdict.** VERIFIED / INCOMPLETE / NOTHING CHECKED / DOES NOT PASS instead of a bare pass; the film receipt follows it. check-spec.mjs --json writes a reproducible report with spec and kit hashes.
- **Tests and CI.** tests/gate.test.mjs (17 cases, including a tampered RAR5 byte) and a GitHub Actions workflow that also checks that an unfilled template fails.
- **Recognisable.** spec.recognize (object, iconic features tied to parts, recorded blind test), ?bare stills and scripts/stranger.mjs. The hub and the first RAR5 film were not recognised and say so.
- **Software.** RAR5 (87 bytes rebuilt byte for byte, accepted by UnRAR) and WinRAR unpacking (DEFLATE decoded from RFC 1951 one token at a time against real WinRAR output, zlib and the stored CRC-32).
- Switch: the spring is ESTIMATED, and the force-curve note no longer implies the maker contradicts itself.
- Wording: "build inspectable models from evidence" instead of "exactly".

## 0.1.0 - 2026-10-12

First public release: the skill, the kit, the dossier look, 11 objects with films, viewers and 3D models.
