# Antikythera, Human-refined version

This is NOT the autonomous run. The autonomous run (an unassisted agent, 27 minutes, skill commit 6fd5295) is in `..\antikythera\` and is untouched. This folder is that run's spec copied and then edited by hand (Claude Code with a person asking for the changes), so it must always be shown labelled "Human-refined version", next to the autonomous one and never instead of it.

## What did NOT change (the mechanics)

The gear train, the tooth counts, the six checks and the gate verdict are exactly the agent's: `VERIFIED   6 reproduced, 4 estimated, 0 unchecked`. The limits the run already had remain: three of the six ratios pass through lost gears whose tooth counts are estimates (they only show the reconstruction is self-consistent), b1 = 223 is tested by no ratio, one module for every mesh (b1 is drawn about 14 % smaller than the measured tip radius), and the pin-and-slot lunar anomaly, the crank gear a1, r1, the Callippic dial and the planet displays are not modelled.

## What changed (all ESTIMATED decor, drawn for recognisability; the spec says so on every part)

- v1: the frame bars are matte (no bloom crossing the title), the front dial carries scales, two pointers, a crank; every view looked at the front.
- v2: the front dial follows what the opened sources describe: a 365-day Egyptian calendar ring outside with the months named in Greek, the zodiac ring inside with the twelve signs in Greek, a Moon pointer with a phase ball; the back has a Metonic spiral (235 cells, 5 turns), a Saros spiral (223 cells, 4 turns), a Games dial and an Exeligmos dial (the cell counts are the published ones, the radii are drawn); the case bars are brown (wood); iso and side views look at the front, expl and three at the back.
- The Greek spellings of the sign and month names are the usual ones and were not checked against the real inscriptions, which are partly lost. Radii, tick spacing, hands and the crank are not published in any source I opened.

## Blind test, with the history

- Autonomous run: a fresh Haiku said "a mechanical gear train, most likely a clock or watch movement" (70 %); a first judge that saw the file name was voided. Not recognised.
- Refined v1: a fresh Haiku said "mechanical astronomical clock with a zodiac dial and a hand crank" (70 %). Category right, not named.
- Refined v2: a fresh Haiku said "Antikythera mechanism" (60 %); a fresh Sonnet said "Antikythera mechanism" (93 %), citing the Greek zodiac inscriptions, the crank and the bronze gears. Both named it. The inscriptions and the crank are decor, so this says the drawing is recognisable, not that the reconstruction is more faithful.

Files: `spec.js` (current), `spec-v1.js` (before v2), `antikythera-refined-short.mp4`.
