# Security

mechanism is a skill and a set of local scripts. It runs your own specs in your own browser and Node; it does not serve anything or take network input.

**The gate is not a sandbox.** A spec is JavaScript. `check-spec.mjs`, `registry.mjs` and the tests load it with Node's `vm` module, which is a loader and not a security boundary: a spec can reach the host process. Never run the gate, the registry or a render on a spec you got from the web or from a pull request without reading it first. To run one you do not trust, use `node --permission --allow-fs-read=<repo>` (Node 22+), or a container. The CI workflow runs pull-request specs on a throwaway runner with a read-only token.

Things worth reporting:

- `scripts/render.mjs`, `probe.mjs` and `stranger.mjs` start a headless Chromium with a remote-debugging port on 127.0.0.1 for the duration of the run. A way to make that port reachable from elsewhere, or to make a spec execute code outside the page sandbox, is a vulnerability.
- Specs are JavaScript (`mechanism.calc` evaluates expressions with `new Function`). **Only run specs you trust**, the same as any script. A spec that reads files, makes requests or spawns processes outside the documented `scripts/make-*-sample.mjs` evidence scripts is a bug.
- The evidence scripts run local tools (Rar.exe, UnRAR.exe, WinRAR.exe) with fixed arguments. Report anything that lets a spec choose the command.

Report privately through GitHub's "Report a vulnerability" on the repository's Security tab, or open an issue with no exploit details and ask for a contact. There is no bounty; fixes are credited.
