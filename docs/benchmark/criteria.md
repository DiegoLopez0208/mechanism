# Autonomy benchmark: criteria fixed BEFORE the first result

Written 2026-10-15, about 23:40 local time, while the first run (Antikythera) was in progress and before any result of it was read.

## The test

- Request given to the agent, and nothing else: "Use mechanism to model the Antikythera mechanism from its published sources."
- The request came from a reader of the first post, not from me.
- Skill version: repository commit 6fd5295 (pushed). The agent may not change the repository.
- Agent: a Claude Code subagent (general-purpose) with a clean context. It is NOT a fully independent session: it has my tools and was started by the session that wrote the skill.
- Conditions to report with the result: the GPU was shared with another render job during part of the run; budget about two hours; the agent writes its own BENCHMARK-LOG.md; nothing is published by the agent.

## Outcomes (decided now)

**Full autonomous success** needs ALL of these:
1. `check-spec.mjs` passes (no errors) and the verdict is VERIFIED with at least one check that is not a unit conversion.
2. Every number is tagged SPEC / MEASURED / DERIVED / ESTIMATED, and every source cited was actually opened by the agent (URL and date). Blocked sources are not cited. Disputed or missing parts are ESTIMATED with a reason.
3. `preflight.mjs` reports 0 FAIL, and every WARN is classified by looking at the frame.
4. A short cut is rendered to MP4 with sound.
5. The stranger test is run and its result recorded, whatever it says.
6. STL and GLB exported.
7. No human input during the run.
8. Finished inside the budget.

**Partial success:** a valid, verified spec of some subsystems with the limits written down, or a VERIFIED spec that was not rendered, or a render whose stranger test failed. Counts as partial, not as autonomous success.

**Failure:** no spec that passes the gate, or no render.

## Rules for reporting

- The first run is published as it came out: label "Autonomous run". Nothing is edited by hand before that.
- If I improve it afterwards by hand, it is a separate artifact labelled "Human-refined version", shown next to the first one, never instead of it.
- Failed attempts and the log stay. The count of iterations (gate runs, preflight runs, renders) comes from the agent's own log.
- One run is one data point. It is not a success rate. A rate needs the 20 objects.

---

## Addendum 1 (2026-10-15, about 23:50 local time; no result of the run had been read). The text above is not edited.

1. **What "no human input" means.** It means nobody guides or changes the run once it has started. Writing the skill, defining the experiment and launching the agent are not interventions during the run. The accurate description is: unassisted agent execution in a clean-context subagent (not a fully independent session). The note at the end of my earlier message that this "breaks" the rule was too strong and is withdrawn. The documentation of the benchmark is my responsibility; the agent cannot certify by itself that it received no help.
2. **Precedence between categories** (the definitions above overlapped: "a VERIFIED spec that was not rendered" was partial, "no render" was failure). From now on:
   - **Complete:** all eight criteria are met.
   - **Partial:** the spec passes the gate, but at least one of the eight criteria is not met (for example no render, a failed stranger test, no export, out of budget, a warning left unclassified).
   - **Failed:** there is no spec that passes the gate. The gate refuses to render a spec that does not pass, so a render without a passing gate does not exist.
3. **Two results are recorded separately.**
   - *Autonomy result:* Complete / Partial / Failed as defined above, plus time, iterations and where it got stuck.
   - *Artifact quality:* whether the reconstruction is defensible from its own cited sources (each claim against its source, checked by me) and recognisable (the stranger test). The Antikythera mechanism has disputed parts, so a simplified reconstruction can score Complete on autonomy and still be limited as an artifact. I am not an expert on the mechanism: this is recorded as defensible / simplified / not defensible, with the reasons, and it is not an expert judgement.
4. The original criteria stay as written; this addendum only removes the overlap and adds the second result.

## Addendum 2 (2026-10-16, before run 02 started and before any result of it)

- **Run 02 object:** the 3.5-inch floppy disk (1.44 MB). It was chosen by me (run 01 was chosen by a reader), because it is a different kind of object: published figures that come out of each other (tracks x sides x sectors x bytes, rotation speed, data rate) plus a small recognisable shell, instead of a gear train.
- **Request:** "Use mechanism to model the 3.5-inch floppy disk (the 1.44 MB one) from its published sources."
- **Skill version:** commit 8845863 (the version after the fixes that run 01 found; run 01 used 6fd5295). Same criteria, same outcome definitions, same two results (autonomy and artifact quality), same budget (about two hours), same conditions (clean-context subagent, not a fully independent session; the GPU may be shared with another job).
- Run 01 and run 02 are different versions of the skill and different objects: they are two data points, not a trend.

---

## Addendum 3 (2026-10-16, after runs 01 and 02; the text above is not edited)

The gate changed after the two runs: **VERIFIED now needs at least one published figure from a source independent of the model's inputs**; when every figure shares its source with the inputs the state is the new **CONSISTENT** (commit after `bafecf8`; see CHANGELOG, "Gate: provenance"). The reason is a reader's question: if the agent writes both the model and the published figure, a wrong source makes the gate agree with itself.

Criterion 1 above says "VERIFIED". It refers to the gate that existed when each run was made, and the classifications already published stay as they were. For the record, what today's gate says about the same specs:

| Spec | Gate when it ran | Gate today | Independent / same source |
|------|------------------|------------|---------------------------|
| Floppy (run 02) | VERIFIED | VERIFIED | 2 / 6 (7 dimension and test-vector checks not classified) |
| Antikythera (run 01) | VERIFIED | CONSISTENT | 0 / 6 |
| Antikythera, hand-refined | VERIFIED | CONSISTENT | 0 / 6 (same gears, same checks) |

Read against today's criterion 1, run 01 would not meet it (Partial, not Complete); run 02 still does. That is a change of the rule after the result, so it is reported next to the original result and does not replace it. From run 03 on, criterion 1 means the gate of the commit written in the run's notes.
