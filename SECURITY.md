# Security

mechanism is a skill and a set of local scripts. It runs your own specs in your own browser and Node; it does not serve anything or take network input.

Things worth reporting:

- `scripts/render.mjs`, `probe.mjs` and `stranger.mjs` start a headless Chromium with a remote-debugging port on 127.0.0.1 for the duration of the run. A way to make that port reachable from elsewhere, or to make a spec execute code outside the page sandbox, is a vulnerability.
- Specs are JavaScript (`mechanism.calc` evaluates expressions with `new Function`). **Only run specs you trust**, the same as any script. A spec that reads files, makes requests or spawns processes outside the documented `scripts/make-*-sample.mjs` evidence scripts is a bug.
- The evidence scripts run local tools (Rar.exe, UnRAR.exe, WinRAR.exe) with fixed arguments. Report anything that lets a spec choose the command.

Report privately through GitHub's "Report a vulnerability" on the repository's Security tab, or open an issue with no exploit details and ask for a contact. There is no bounty; fixes are credited.
