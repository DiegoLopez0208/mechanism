# Security

mechanism is a skill and a set of local scripts. It runs your own specs in your own browser and Node. It takes no network input; the only things it serves are short-lived, loopback-only helpers during a render (a file allowlist for the review pages, `scripts/lib/media-server.mjs`).

**A spec is JavaScript, and Node's `vm` module is not a sandbox.** A spec can reach the host process through any host object in its context. So the scripts that load specs contain them with Node's permission model (Node 22.13+):

| Script | May read | May write | Processes, network, workers |
|---|---|---|---|
| `check-spec.mjs` | the repository (or installed skill) and the spec's folder | only the `--json` report | none |
| `export-svg.mjs` | the same, plus `--out` | only inside `--out` | none |
| `registry.mjs` | the repository | `docs/registry.json`, `docs/registry.html`, `docs/badges/` | none |

Each re-runs itself under `node --permission` with those grants before it loads a spec. `--trusted` (or `MECHANISM_TRUSTED=1`) skips that for a spec you wrote yourself on an older Node; never use it on a spec from the web or a pull request. `scripts/check-all.mjs` runs every example through `check-spec.mjs`, one process each.

The tests and the render scripts (`render.mjs`, `probe.mjs`, `stranger.mjs`) still load specs without this containment: read a spec before you render it. The CI workflow runs pull-request specs on a throwaway runner with a read-only token.

An agent running this skill must not stop processes by name (`taskkill /IM`, `pkill`): SKILL.md says so, because a test run did exactly that and ended every Node process on the machine, MCP servers included.

Things worth reporting:

- A spec that, under `check-spec.mjs`, `export-svg.mjs` or `registry.mjs` without `--trusted`, reads, writes, spawns or connects beyond the table above.
- The headless Chromium of the render scripts is driven over a private pipe (`--remote-debugging-pipe`), not a TCP port. `MECHANISM_CDP=port` switches back to a port on 127.0.0.1 for the duration of the run; a way to reach that port from elsewhere, or to make a page escape the browser sandbox, is a vulnerability.
- `mechanism.calc` evaluates expressions with `new Function`; inside the contained gate that is still contained. A spec that reads files, makes requests or spawns processes outside the documented `scripts/make-*-sample.mjs` evidence scripts is a bug.
- The evidence scripts run local tools (Rar.exe, UnRAR.exe, WinRAR.exe) with fixed arguments. Report anything that lets a spec choose the command.

Report privately through GitHub's "Report a vulnerability" on the repository's Security tab, or open an issue with no exploit details and ask for a contact. There is no bounty; fixes are credited.
