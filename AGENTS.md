# AGENTS.md - How to Work in This Repo

> Operating guide for AI agents working on DC Vehicle Safety.
> Read [CLAUDE.md](CLAUDE.md) for project intent and engineering rules. Read [DESIGN.md](DESIGN.md) before changing the UI or recommendation presentation.

---

## Token And Effort Discipline

Be judicious with tokens. The expensive failure mode here is fanning out a large multi-agent or deep-research flow, having it stall or return noise, and burning a large budget before producing anything useful.

- **Efficient first, then fan out and scale.** Solve the task the cheapest way that can work, confirm the approach produces good results, and only then widen to parallel agents, deep research, or large sweeps.
- **Start with one cheap probe.** Before a broad run, do a single small fetch / one search / one file read to confirm the source, schema, and query shape are right. A 5,000-row pull that returns garbage costs more than the one row that would have caught it.
- **Prefer the local, static, cached path.** Reuse cached data, baked JSON, and existing code before issuing new live queries or spawning agents. Re-runs should not re-fetch unchanged data.
- **Scope deep research narrowly.** These flows can fail or wander. Give them a tight, verifiable question, a small source set, and a clear stop condition. Do not launch one to answer something a targeted query or a doc already answers.
- **Match the tool to the task size.** Single-fact lookup → read it directly. Bounded change → do it inline. Reserve multi-agent orchestration for work that genuinely needs breadth, and say so before spending on it.
- **Fail fast and stop.** If a flow is not converging, stop, report what you have, and pick a cheaper approach rather than retrying the same expensive path.
- **Surface the cost/benefit before a big spend.** If a step will be token-heavy, state why it earns the cost and what the cheaper alternative would miss.

### Web search and deep research

Web search and multi-agent deep-research flows are the easiest way to burn a large budget for little return — they fail, wander, or return noise, and the cost is already spent by the time you find out. Default to *not* using them.

- **Don't reach for deep research unless the task genuinely needs it.** Most questions are answered by one or two targeted `WebSearch`/`WebFetch` calls, a doc already in the repo, or a primary source you can fetch directly. A heavy multi-agent research flow is a last resort for genuinely broad, multi-source synthesis — not the default for "look something up."
- **`deep-research` is expensive and unreliable.** It spawns multiple agents in parallel and can burn thousands of tokens. Only invoke it when you're doing authentic multi-source synthesis that can't be solved with a bounded set of targeted searches and fetches. If the user says "do some research," still start with 2-3 cheap searches; escalate to `deep-research` only if those turn up nothing and the task truly warrants the cost.
- **Test a small query first to seed the format.** Before any fan-out, run one narrow search/fetch to confirm the source exists, the data is in the shape you expect, and the query terms actually hit. Use that result to fix the query and the output schema, *then* widen. Never launch a big batch blind.
- **Prefer the primary source over a search sweep.** If you know the authoritative page or dataset (Open Data DC, DDOT, a known URL), fetch it directly instead of searching around it.
- **Bound every research flow.** Tight question, small named source set, explicit stop condition, and a rough call count (e.g. "~6-10 searches, a few fetches"), not an open-ended crawl. Say the budget out loud before starting.
- **One focused agent over a big fan-out.** When delegation helps, prefer a single scoped research agent that returns the conclusion. Reserve large multi-agent orchestration for work that has been explicitly authorized and clearly needs the breadth.
- **Stop on the first sign of failure.** If searches return junk or a flow stalls, stop and report what you have — do not keep retrying the same expensive path hoping it converges.
- **Verify before publishing.** Treat scraped figures as research-grade until checked against the primary source (see the editorial promise in CLAUDE.md); don't spend more tokens polishing an unverified number.

### Search economics

A search subagent is not a free "go find it" button. It carries fixed overhead — its own system prompt, the full tool schemas, and a verbose report — and hands back a *summary*, not the code. For a "where is X?" question in this repo (a few thousand lines of JS/Python/HTML), that is the wrong trade. Climb a ladder and stop the moment the question is answered:

1. **`rg`/`grep` for the mechanism, not the concept.** To find every sort, search `\.sort(\|sorted(` — not "the sorting logic." A literal grep is *exhaustive* where a concept-search is not: a semantic agent can silently miss a call site that grep would catch.
2. **Targeted `Read`** with `offset`/`limit` around the matched lines.
3. **A subagent only for genuine fan-out** — many whole files, an unknown-shape question across a big tree, or parallel investigations.

- **Don't double-search.** If you grep, don't also spawn an agent for the same question; if you spawn an agent, trust it instead of re-reading the same files. Pick the cheaper tool and commit.
- **For mechanical "every call site / reference / usage" changes, verify a subagent's list against a grep before acting on it.** Agents report what they noticed; grep reports what exists.
- **Size before you choose.** `git ls-files '*.py' '*.js' '*.html' | xargs wc -l` is cheaper than guessing how big the search is — state the size, then pick the strategy.

### Connectors and research tooling

When a task warrants a scraper or research connector (e.g. harvesting community/source candidates):

- **Automate only the mechanical parts; never auto-publish.** Output goes to a gitignored staging dir (`data/candidates/` or similar) for human curation. Editorial judgment — stance, quote selection, policy framing — stays with a person.
- **Bake in anti-fabrication guardrails.** Surface only *verbatim* quote candidates (never paraphrase). If a publication date can't be extracted, leave it `null` and flag it loudly rather than guess. Emit editorial fields that can't be machine-inferred as `null` + a TODO. This is the editorial promise (CLAUDE.md) made operational.
- **Be polite and idempotent.** Disk cache, a per-host throttle, and 429 backoff — the same network-ethics rules in CLAUDE.md.
- **Cite around bot-blocks instead of guessing.** When a source 403s to `curl`, pivot to a primary source that returns 200 and add a cross-reference; don't fabricate the figure to fill the gap.

### Verification cadence

- **Verify at three viewports every UI run** — desktop 1280, tablet 768, mobile 375 — and check the tablet breakpoint first; regressions show there before anywhere else.
- **Define "done" as a concrete, repeatable checklist**, and log a clean pass explicitly. For this repo: tests pass, zero console errors, no failed network requests, no duplicate/future-dated/back-dated data rows, and every source URL resolves (or is marked unavailable). "Zero new bugs found" is a result worth writing down, not silence.

---

## Read These First

Before touching code or data, read:

1. [CLAUDE.md](CLAUDE.md) - project intent, data rules, recommendation rules.
2. [DESIGN.md](DESIGN.md) - visual system, map/table UX, accessibility.
3. `backlog.md` if present - planned work and priorities.
4. `issues.md` if present - known bugs, data-quality problems, source outages.
5. `security.md` if present - latest dependency/advisory sweep.

If one of those files is missing, do not invent history. Create it only when the task calls for it.

---

## Workflow: Explore -> Plan -> Code -> Verify

### Explore

- Use `rg` / `rg --files` first.
- Read relevant files before editing, even if they were read earlier in the session.
- For data work, inspect the schema, a small sample of source rows, and the canonical output before changing logic.
- For UI work, inspect the current component/layout pattern before introducing a new one.

### Plan

For anything beyond a one-line fix, state the approach before editing. Significant changes need 2-3 options with tradeoffs, especially when they affect:

- data schema
- recommendation rules
- source hierarchy
- visual identity
- map/table interaction
- dependency choices
- public policy framing

### Code

- Prefer existing files and local patterns.
- Keep changes scoped to the requested behavior.
- Do not add helper abstractions for one-shot logic.
- Do not loosen schema or tests without understanding why they exist.
- Keep source data edits and generated/baked outputs together when both are required.

### Verify

- Run the narrowest meaningful tests first, then broader tests when the change has cross-cutting risk.
- For UI changes, also run the app and click through the affected flow.
- For data changes, inspect the output diff. A quick skim catches schema drift, broken encodings, unexpected nulls, and runaway file size.

### Handle PR Review Comments

When a PR receives review comments, **do not assume the work is done just because the PR merged:**

- **Read all review comments thoroughly.** Fetch the full review bodies, not just summaries. A review marked "COMMENTED" means it requires action, not just an FYI.
- **Follow user-provided links explicitly.** When a user gives a direct URL to a PR review, treat that as the authoritative source. Don't skim; read the full text.
- **Extract a checklist from review feedback.** Before declaring a PR resolved, list each distinct issue the reviewer raised:
  - Accessibility regression (missing ARIA roles)
  - Deep-linking broken (hash not syncing)
  - Data provenance missing (undocumented static JSON)
  - UX flaw (unwanted scroll behavior)
- **Address all feedback before considering work complete.** A merged PR is not the end; it's the start of addressing the feedback it received.
- **Test the feedback, not just the happy path.** Review comments often point to edge cases or UX flows that weren't tested. Verify those specific flows work as intended.

---

## Verification Matrix

Update this once the stack is real. Until then, use this matrix as the default.

| Change kind | Verify with |
| --- | --- |
| Schema/model change | schema tests + fixture validation |
| Source connector | connector tests + one small live fetch if ethical and needed |
| Data normalization | before/after fixture diff + required-field tests |
| Geospatial join | boundary/outlier tests + spot-check map coordinates |
| Recommendation rule | unit tests for each rule branch + sample explanation output |
| Frontend map/table/filter | unit tests where available + browser walkthrough |
| Design tokens | visual check at mobile and desktop + contrast/focus check |
| Dependency install/upgrade | advisory sweep + lockfile diff + test/build |
| Anything substantial | full test suite and build |

---

## Common Tasks

### Add a Data Source

1. Confirm it is in scope and preferably listed in [CLAUDE.md](CLAUDE.md).
2. Add or update the source entry in the canonical config.
3. Create a connector with a stable slug and cache namespace.
4. Save raw source snapshots with `captured_at`.
5. Normalize into typed records, preserving raw fields where cleaning occurs.
6. Add fixture tests and schema tests.
7. Run a small fetch before a full run.
8. Update docs with the source, caveats, and refresh cadence.

### Add a Recommendation Rule

1. Write the rule in prose first: trigger, evidence, mechanism, confidence, uncertainty.
2. Add or update the canonical intervention taxonomy if needed.
3. Implement with explicit thresholds and source-backed features.
4. Add tests for positive, negative, boundary, and missing-data cases.
5. Ensure the UI shows the rationale and not just a label.

### Add a Map or Table Filter

1. Add the filter to the canonical filter state, not just the component.
2. Ensure reset clears it.
3. Ensure URL/share state includes it if the app supports permalinks.
4. Render an explicit empty state when no records match.
5. Add tests for combined filters.

### Add a New Category or Vocabulary Item

This is a schema change. Do not do it casually.

1. Add a `backlog.md` note explaining the gap.
2. Add the value to the canonical constant.
3. Mirror labels/colors/icons from the same source of truth.
4. Migrate existing records if appropriate.
5. Add drift tests so frontend/backend copies cannot diverge.

---

## What Not To Do

- Do not add a source record without a real source URL.
- Do not silently drop rows because they are hard to parse.
- Do not represent missing data as zero.
- Do not overwrite raw source captures.
- Do not create a "safety score", "danger score", or "bad neighborhood" ranking without transparent components and explicit approval.
- Do not LLM-classify policy judgments as if they were facts.
- Do not use enforcement-heavy framing as the default recommendation.
- Do not add a new framework, UI kit, map stack, charting dependency, font, or analytics SDK without a clear reason.
- Do not edit baked `docs/data/*.json` by hand if a source or seed file generated it.
- Do not expand scope inside a bug fix. Put follow-up ideas in `backlog.md`.
- Do not use `--no-verify` to bypass tests or hooks (it would also skip the commit-msg hook below).
- Do not add AI co-author trailers to commits. No AI assistant is ever credited as a
  co-author. This is enforced automatically: the version-controlled `.githooks/commit-msg`
  hook strips any `Co-Authored-By: Claude/Anthropic`, `Generated with Claude Code`, or
  `🤖` attribution line. Enable it once per clone with `sh scripts/setup-hooks.sh`
  (sets `core.hooksPath` to `.githooks`). Do not remove or weaken this hook.

---

## Repo Norms

- Type hints on every Python function.
- TypeScript strict mode and no `any` if TypeScript is used.
- Use `pathlib.Path` for Python file paths.
- Use logging for runtime output; no bare `print()` in production paths.
- Functional components and hooks only if React is used.
- Constants, labels, category lists, and color semantics live in one source of truth.
- Loading, error, and empty states exist for every data view.
- Touch targets are at least 44px.
- Mobile-first behavior is verified before declaring UI work done.
- System fonts by default.

---

## Data Review Checklist

Before shipping a data refresh or analysis output:

- Required fields are present.
- Source URLs resolve or are marked unavailable.
- `captured_at` is set.
- Row counts are plausible versus the prior snapshot.
- Duplicate IDs are intentional or resolved.
- Nulls are explicit and meaningful.
- Coordinates fall inside expected boundaries or are flagged.
- Date ranges match the source metadata.
- Rates and comparisons use appropriate denominators.
- The output diff does not include unrelated churn.

---

## Policy Review Checklist

Before shipping a policy recommendation:

- The recommendation states its mechanism.
- The evidence links back to source records.
- The confidence level matches the data quality.
- The uncertainty is visible.
- Enforcement, engineering, and equity tradeoffs are separated.
- The recommendation does not overstate causality.
- The language describes fixable street conditions, not resident blame.

---

## Escalate To The Human When

- The source conflicts with another authoritative source.
- A dataset disappears, changes license, or changes schema in a way that affects historical results.
- A recommendation would be politically or ethically sensitive.
- The policy taxonomy needs a new top-level category.
- A schema migration affects source data, output JSON, UI, and tests.
- A failing test looks unrelated but blocks confidence.
- The task requires a paid API, browser challenge workaround, or rate-limit-heavy scraping.

---

## Current Project Status

This repo currently starts with documentation only. The first implementation pass should choose a minimal stack and build one end-to-end path:

1. fetch one official crash dataset,
2. normalize and validate it,
3. emit a small baked JSON file,
4. render a map/table view,
5. show source attribution and one simple analysis.

Do not start with a giant multi-source pipeline. Start with the loop that proves the product can work.

