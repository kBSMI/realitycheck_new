# SMI Morphological Continuity Engine v0.1

This implementation brief defines the first deterministic service layer for AI Reality Check and SMI continuity reporting.

## Boundary

The engine is deterministic and local-first. It does not use AI agents, external LLM calls, hidden platform scraping, or LLM-as-judge scoring.

The engine evaluates user-provided text only:

- user goal
- original prompt
- AI output
- optional expected format
- optional target audience
- optional baseline output
- optional improved output
- selected pain points

## Whitepaper-to-engine translation

The implementation preserves SMI concepts in engineering-safe product language:

| SMI / Genesis concept | Product-engine implementation |
| --- | --- |
| Symbolic anchors | Continuity anchors |
| Emotional continuity vectors | Tone/context continuity vector |
| Drift-resistant memory chains | Baseline continuity chain |
| Resonance score | Alignment/resonance score |
| Echo-weight index | Repeated-importance signal |
| Entropy/decay | Drift pressure / entropy index |
| .lcaimem token | Local continuity token record |
| Trinary logic | Accept / revise-hold / rerun-compost |
| Symbolic resurfacing | Recovery prompt / missing-context restoration |

## Engine outputs

The engine returns:

- intent signature
- prompt signature
- output signature
- optional baseline/improved signatures
- continuity anchors
- emotional continuity vector
- `.lcaimem`-style local tokens
- symbolic/morphology/resonance scores
- drift findings and reason codes
- trinary decision
- next best prompt
- audit record with stable hashes

## Reason codes

Initial deterministic reason codes include:

- FORMAT_DRIFT
- AUDIENCE_DRIFT
- TASK_SUBSTITUTION
- GENERIC_OUTPUT
- MISSING_CONSTRAINT
- TONE_MISMATCH
- UNSUPPORTED_FACTUAL_CLAIM
- SOURCE_REQUIREMENT_MISSED
- ACTIONABILITY_GAP
- BASELINE_DEVIATION
- CONTEXT_LOSS
- OVERBROAD_RESPONSE
- HIGH_DRIFT_PRESSURE
- LOW_SYMBOLIC_ALIGNMENT
- LOW_ECHO_WEIGHT
- NO_OUTPUT_PROVIDED

## Trinary decisions

- `+1` = accept / preserve / recall
- `0` = hold / revise / verify
- `-1` = compost / rerun

User-facing copy should translate these into clear actions rather than exposing internal symbolic language.

## Audit posture

Audit hashes use a stable browser-safe FNV-1a fingerprint for MVP traceability. This is not a cryptographic security guarantee. Production should replace or supplement this with server-side cryptographic hashing.

## Production next steps

1. Persist engine results with saved reports.
2. Add server-side audit hashing when backend exists.
3. Add baseline libraries for repeatable teams/enterprise workflows.
4. Add versioned score calibrations.
5. Add export fields for reason codes, recommendation action, and engine version.
6. Preserve the no-agent/no-external-LLM scoring boundary.
