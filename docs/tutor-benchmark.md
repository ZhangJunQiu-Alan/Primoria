# PrimoriaTutorBench Stage 0

PrimoriaTutorBench is the pre-upgrade answer-quality baseline for the AI Tutor.
It is deliberately separate from the product runtime: it does not write learner
facts, mastery, courses, chat history, or knowledge-graph data.

## Scope

The versioned fixture at
`apps/agent/evals/tutor-benchmark.v1.json` contains 12 synthetic Chinese and
English cases across mathematics, physics, computer science, biology, and
economics. Cases cover checkable solving, explanation, source-grounded answers,
and one-question practice.

Stage 0 measures deterministic contracts in six dimensions:

- correctness;
- source faithfulness, including exact `[source:<id>]` validation;
- use of relevant learner context;
- pedagogical scaffolding;
- instruction following;
- non-disclosure of hidden evaluation context.

These checks are intentionally narrow. Keyword, numeric, regex, length, and
citation checks can catch regressions, but they do not establish that an answer
is educationally excellent. Human review, learner studies, and any future LLM
judge must be reported as separate evidence.

## Chinese review benchmark

`primoria-tutor-bench-zh-v1` adapts the TUTORBENCH construction pattern into a
fully Chinese, source-constrained review set. It contains 20 synthetic learner
profiles and 60 tasks across mathematics, physics, chemistry, biology, computer
science, and economics. Every profile has three explicit misconceptions and
three tasks. The task mix is 30% concept understanding, 30% problem solving,
20% application, and 20% comparison.

The machine dataset and human review artifact are:

- `apps/agent/evals/tutor-benchmark.zh.v1.json`;
- `docs/Primoria中文TutorBench-v1-审阅稿.md`.

Rebuild or verify their synchronization with:

```bash
pnpm eval:tutor:zh:build
pnpm eval:tutor:zh:check
```

After human review, run a selected live slice with explicit API authorization:

```bash
PRIMORIA_TUTOR_BENCH_LIVE=1 pnpm eval:tutor -- \
  --live \
  --dataset apps/agent/evals/tutor-benchmark.zh.v1.json \
  --limit 6
```

The current live runner scores only the first turn. Each Chinese case also
contains one review follow-up and an expected adaptation, but those fields are
reserved for manual review and a future multi-turn runner. They must not be
reported as automatically evaluated yet.

The Chinese suite has hard dimension gates: correctness, source faithfulness,
and hidden-context safety must each score 100%, in addition to the 80% weighted
case threshold. This prevents a strong style score from masking a wrong answer
or invalid citation.

## Zero-cost validation

This command validates the fixture, source references, check contracts, unique
IDs, thresholds, and dimension weights. It never calls a model:

```bash
pnpm eval:tutor:validate
```

Running `pnpm eval:tutor` with no response source also performs validation only.

## Score imported responses

Use this path for responses captured by another runner or provider:

```bash
pnpm eval:tutor -- --responses /absolute/path/to/responses.json
```

The response file contract is:

```json
{
  "schemaVersion": 1,
  "benchmarkId": "primoria-tutor-bench-v1",
  "run": {
    "mode": "imported",
    "startedAt": "2026-07-17T00:00:00.000Z",
    "provider": "provider-name",
    "model": "model-name"
  },
  "responses": [
    {
      "caseId": "math.linear-equation.zh",
      "response": "...",
      "latencyMs": 1200,
      "inputTokens": 800,
      "outputTokens": 120,
      "costUsd": null
    }
  ]
}
```

Missing responses fail their cases. Unknown citation IDs fail source
faithfulness. Unknown cost remains `null`; the evaluator never fabricates a
price from token counts.

## Explicit live baseline

The live runner directly calls the configured Agent chat model with the
production Tutor system prompt plus synthetic benchmark context. It evaluates
answer behavior, not the complete AG-UI graph or browser tool-rendering path.

Two explicit signals are required: `--live` and the opt-in environment flag.
The command runs sequentially to make spend and rate-limit behavior legible:

```bash
PRIMORIA_TUTOR_BENCH_LIVE=1 pnpm eval:tutor -- --live
```

For a low-cost smoke run:

```bash
PRIMORIA_TUTOR_BENCH_LIVE=1 pnpm eval:tutor -- --live --limit 2
```

Or target one repeatable case:

```bash
PRIMORIA_TUTOR_BENCH_LIVE=1 pnpm eval:tutor -- --live --case cs.dijkstra-negative.zh
```

`apps/agent/.env` is loaded by the package script when present. The runner uses
the same `AI_PROVIDER`, base URL, API key, and model settings as the Agent and
does not print credentials.

## Reports and quality gate

Each scored run writes timestamped JSON and Markdown reports under
`apps/agent/.eval-results/tutor-benchmark/`; the directory is ignored by Git.
Reports contain per-check evidence, per-dimension scores, pass rate, p50/p95
latency, token totals when providers return usage, known cost, and the count of
cases whose cost is unknown.

A case passes at the fixture threshold (currently 80%). The run gate passes
only when every selected case passes and there are no missing or unexpected
responses. Use `--allow-failures` only when capturing a baseline whose expected
gaps should not make the shell command fail.

When changing the Tutor prompt, model, source/citation behavior, or
personalization logic, run fixture validation in normal verification. Run the
paid live baseline only with an explicit evaluation budget and retain its JSON
report as dated evidence outside Git if it contains provider-specific data.
