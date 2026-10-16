# BENCHMARK LOG - mechanism skill, 3.5-inch 1.44 MB floppy

Machine clock (Git Bash `date`), start: **2026-10-16 00:09:42**. All times below are read from `date`, not estimated.

| Time | Step | What / command | Result |
|---|---|---|---|
| 00:09:42 | start | `date`; read SKILL.md (Read tool), `ls` of repo | repo at 8845863, example specs read: switch, rtx4090 (calc), new.mjs, kit/parts.js, kit/spec-core.js |
| 00:10 | research 1 | WebFetch en.wikipedia.org/wiki/Floppy_disk (2026-10-16) | text only: 90 mm, 1,474,560 B, 18 spt, 512 B, 160 tracks, HD media 1.2 um, spring shutter, metal hub, HD hole, write-protect hole, 135 tpi via ANSI X3.137 ref, 500 Kbps note. No dimensions in mm for hub/shutter. |
| 00:10 | research 2 | WebFetch en.wikipedia.org/wiki/Floppy_disk_format | 80 tracks/side, 18 sectors, 512 B, 2 sides, "1,440 kB", 300 rpm, MFM |
| 00:10 | research 3 | WebSearch ECMA-100 dims; WebFetch jdebp.uk/FGA/floppy-discs-are-90mm-not-3-and-a-half-inches.html | secondary: 90.0 x 94.0 (ECMA), 90.0x94.0x3.3 and disc 85.80 mm (ANSI X3.171-1989) quoted |
| 00:10 | FAIL | WebFetch ecma-international.org/wp-content/uploads/ECMA-125_1st_edition_june_1987.pdf | HTTP 404 (guessed filename wrong). Not cited. |
| 00:10 | research 4 | WebFetch ecma-international.org/publications-and-standards/standards/ecma-125/ | gave the real PDF name (..._december_1987.pdf) |
| 00:10 | FAIL (minor) | WebFetch vde-verlag.de preview PDF of ISO 8860-1 | 301 redirect, then not followed (no dims in a preview anyway). Not cited. |
| 00:10 | research 5 | `curl` ECMA-125 PDF (2.8 MB, 80 pages) into ref/ecma125.pdf | OK, 200. `pdftotext` gives NOTHING (scanned images, no text layer). No tesseract/pdftoppm on the machine. |
| 00:11 | research 6 | PyMuPDF via `uv run --with pymupdf python -I` to render pages to PNG; read pages with Read (vision) | pp. 10-16 (dimensions), 17 (torque, 300 rpm), 21 (tracks), 27-30 (format), Fig.1 and Fig.3 drawings read by eye |
| 00:11 | note | first PyMuPDF script wrote to /c/... path: python on Windows does not know that path (FileNotFoundError); retried with relative path. ffmpeg tile with start_number also failed twice (same-filename muxer error) before `-update 1`. | harmless tool friction |
| 00:13 | research done | ECMA-125 (1st ed. Dec 1987, = ISO/IEC 9529-1, ISO type 302, the 1.44 MB HD format) is the primary source for every dimension. | see spec.js claims |
| 00:15 | new | `node scripts/new.mjs floppy --dir <work> --title "3.5-inch floppy disk, 1.44 MB" --fig "Fig 1"` | created floppy/index.html, run.js, spec.js (template) |
| 00:16-00:19 | spec | wrote spec.js by hand (14 parts, 27 claims, 5 sources, calc mechanism with 18 variables, 11 modes). Decisions: used a `profile` polygon (with zero-width bridges for holes) for case halves, liners, hub and shutter because `plate` only takes round holes. Disk is drawn flat; Side 0 (hub window) is +z. Followed printed L29=17.5 over my own reading of the scanned Fig.1 (about 16): hub is 1.5 mm off the centre of the 94 mm length, written down as a DERIVED claim with its cross-check. | - |
| 00:19:35 | gate #1 | `node scripts/check-spec.mjs .../floppy/spec.js` | **crashed** with a JS exception in my spec (bridge point (0,43) not an exact point on the liner circle). Not a gate verdict. Fixed my helper (snap to nearest vertex). |
| 00:20 | gate #2 | same command | exit 0. Verdict line: `verdict: VERIFIED   15 reproduced (+1 unit conversions, not counted), 5 estimated, 0 unchecked`; `PASSES with 3 warning(s)` (disc bore and hubF thickness are ESTIMATED inside SPEC parts: deliberate, listed; 1 unit conversion = tpi, marked kind:'convert'). No spec numbers were changed to get this. |
| 00:22 | lint #1 | `node scripts/lint-film.mjs .../floppy/index.html --png-dir .../floppy/lint` (background) | `20 shots checked (normal cut, 151.5 s)`, no EMPTY, 2 LOOK (tour disc, tour tab). I opened assembled/exploded/tour-disc/tour-tab PNGs. **Real defects found by looking, none flagged by the tool:** (a) the Side 0 case half had NO hub window and NO head window (my hub-hole bridge started at the top of the circle and crossed the circle: the polygon was mis-triangulated); (b) LOOK disc: dark oxide on dark background, hard to read (real defect of readability: media is brown) -> colour `bronze`; (c) LOOK tab: black tab on dark background -> off-white plastic. The lint did not catch (a): it is a geometry error that only the picture shows. |
| 00:23 | gate #3 | after the hub-hole fix and colour changes | same verdict line, `PASSES with 3 warning(s)`. Gate run count so far: 3 (1 crash of my own spec, 2 passes). |
| 00:24 | lint #2 | same command, PNGs in lint2/ | `20 shots checked (normal cut, 151.5 s)`, `No empty shots.`, no LOOK left. Opened assembled + exploded: hub window, hub holes and head windows now cut through; the tracks show through the shutter window. |
| 00:25 | preflight #1 short | `node scripts/preflight.mjs .../floppy/index.html --length short` | `PASS with 1 warning(s)`: `WARN OBJECT_OFFSCREEN object, t = 14.00 s (1 samples), only 66% of the object is in the frame`. Opened it with `render.mjs --length short --still 14` (warn-t14.png): mid camera push into the exploded stack with motion blur, the case half fills the frame. **Classification: deliberate choice (a close-up move during the explode), 1 sample of 110. Not changed.** |
| 00:25 | preflight #2 normal | `node scripts/preflight.mjs .../floppy/index.html` | `PASS: nothing found.` Preflight run count: 2 (one per cut). |
| 00:27 | stranger test #1 | `node scripts/stranger.mjs .../floppy/index.html` -> still in temp folder; judged by a fresh Sonnet subagent given only the PNG path | Answer: "3.5-inch high-density (HD, 1.44 MB) floppy disk, blue shell ... about 95% confident ... recognised from its shape (square shell with one clipped corner, sliding metal shutter with a window, central hub, small notches/write-protect holes) and also from the 'HD' text". **Passed on the first attempt; one judge only; the judge also read the HD text, so it was not purely shape.** Recorded in `recognize.blind`. |
| 00:28 | gate #4 | after adding recognize.blind | see below |
| 00:28 | gate #4 | `check-spec.mjs` after recognize.blind | `recognisable: 4 iconic features built, blind test recognised`; `verdict: VERIFIED   15 reproduced (+1 unit conversions, not counted), 5 estimated, 0 unchecked`; `PASSES with 3 warning(s)`. Gate total: 4 runs (1 own-spec crash, 3 passes). |
| 00:29 | render short | `node scripts/render.mjs .../index.html --length short --blur 3 --out .../floppy-short.mp4` (background) | `listo: floppy-short.mp4 (film 27.5 s, rendered in 55 s of wall time)`; ffprobe: h264 1080x1350, aac stereo, 27.5 s. Contact sheet short-sheet.png checked: cold open, capacity and 1.44 MB rows, exploded, tours, receipt, VERIFIED card. Not watched in real time; audio only verified as present/stereo. |
| 00:30 | render normal + export | background chain: normal cut, then `--export glb --e 1`, then `--export stl --e 1` | see below |
| 00:28:21 | render normal | `render.mjs .../index.html --blur 3 --out floppy.mp4` | `listo: floppy.mp4 (film 151.5 s, rendered in 285 s of wall time)` (floppy.mp4 41.5 MB) |
| 00:28:33 | export | `render.mjs ... --export glb --e 1` and `--export stl --e 1` | `modelo: floppy.glb 1079 KB`, `modelo: floppy.stl 2071 KB` |
| 00:28:33 | end | `date` | **End 2026-10-16 00:28:33. Total by machine clock: 18 min 51 s.** |

## Honesty correction on the times
Only these were read from `date` at the moment: 00:09:42 (start), 00:10:45, 00:12:07, 00:13:13, 00:13:56, 00:15:23, 00:19:35, 00:20:16, 00:20:57, 00:21:38, 00:21:48, 00:21:57, 00:22:21, 00:23:24 (end of short render), 00:28:21/00:28:33. The other row times in the table above (00:11, 00:16-00:19, 00:22-00:30 etc.) were typed by me as approximate labels while writing and do not match the clock (the real sequence is shorter: gate #2/#3 about 00:19-00:20, lint #2 and preflight 00:20-00:21, stranger 00:21:57, short render finished 00:23:24, normal render and exports finished 00:28:33). Order of events is right; use the clock readings above for durations. Machine rendered fast (short 55 s, normal 285 s), so the GPU was not contended.

## Counters
- Gate (`check-spec.mjs`): 4 runs. #1 crashed on a bug in my own spec (not a verdict); #2, #3, #4: `verdict: VERIFIED   15 reproduced (+1 unit conversions, not counted), 5 estimated, 0 unchecked` / `PASSES with 3 warning(s)`.
- Lint: 2 runs (first: 2 LOOK + a geometry defect found by eye; second: `No empty shots.`).
- Preflight: 2 runs, one per cut. Short: `PASS with 1 warning(s)` (OBJECT_OFFSCREEN at t=14 s, classified deliberate). Normal: `PASS: nothing found.`
- Stranger test: 1 run, recognised (95 %).
- Renders: short 1, normal 1, GLB 1, STL 1.

## Not checked
- Film not watched in real time; audio only checked as stereo AAC present. Only a contact sheet of the short cut and stills were looked at; the normal cut was not viewed at all.
- Head-window and shutter-recess are simplified (shutter drawn proud of the case, 0.4 mm over 3.3 mm; no recess; no handling notches, no case-edge steps from Fig. 3 L23-L31).
- ECMA numbers were read by eye from scanned pages (no OCR): a misread digit is possible; the cross-checks (62.8 urad vs 15,916 ftprad, 2.0 MB raw, 40.00 window centre, 1.35 vs 1.40 hub height) all closed, which argues against it.
