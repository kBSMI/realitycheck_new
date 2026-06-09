# SMI Morphological Continuity Engine v0.2 Enterprise Brief

## Purpose
This engine upgrade turns AI Reality Check / SMI from a local heuristic scorecard into a deterministic, enterprise-shaped continuity assessment service. It remains local-first and does not use AI agents, external LLM calls, or LLM-as-judge scoring.

## Core Improvements

### 1. Better Symbolic Parsing
The engine now extracts:
- direct term matches,
- quoted phrases,
- 2–4 word key phrases,
- structural markers such as bullet lists, numbered lists, tables, headings, phased plans, and code blocks,
- source-of-truth markers,
- enterprise/domain/risk markers.

### 2. Canonical Hashing
The old object hash path has been upgraded to canonical JSON stringification with deterministic nested-key sorting and a stable 64-bit fingerprint. This is still a browser-safe audit fingerprint, not a server-side cryptographic signature. Production enterprise ledgers should pair it with SHA-256/HMAC or managed key signing.

### 3. Resonance Sigil
The engine now generates a resonance signature / sigil from:
- ordered anchor sequence,
- echo-weight vector,
- emotional continuity vector,
- trinary memory-state sequence.

The resonance sigil is intended to represent the unique continuity pattern of the assessment. It should be treated as a resonance fingerprint and paired with cryptographic signing for enterprise security.

### 4. Baseline Comparison
Baseline preservation is now first-class. The engine returns:
- baselineProvided,
- baselineAlignment,
- preservedAnchors,
- missingAnchors,
- deviationReasonCodes.

### 5. Improvement Comparison
Improved output can now be evaluated through the SMI engine without external AI calls. The engine returns:
- originalResonanceScore,
- improvedResonanceScore,
- resonanceDelta,
- originalDriftPressure,
- improvedDriftPressure,
- driftPressureDelta,
- improvedDecision,
- improvedReasonCodes.

### 6. Confidence Profile
Reports now include:
- confidenceScore,
- intervalLow,
- intervalHigh,
- basis statements,
- evidenceCount,
- inputCompleteness.

### 7. Versioned Rule Profile
Weights and thresholds are centralized in `src/services/smiEngine/engineConfig.ts` so reports can cite the scoring profile.

### 8. Source-of-Truth Erosion Detection
The engine now detects `SOURCE_CONTEXT_EROSION` when source/citation/trusted-evidence requirements exist but the output lacks verifiable source markers or makes factual-sounding unsupported claims.

### 9. Enterprise Input Adapters
The engine now includes batch and stream-shaped adapters:
- `processEnterpriseBatch`
- `createStreamAccumulator`
- `buildEnterpriseProfile`

This does not claim production SLA by itself. It creates the service boundary needed for future queue/worker/Supabase or enterprise deployment.

### 10. Enterprise Audit Ledger Entry
The engine can produce a local-first enterprise audit ledger entry containing:
- audit record,
- resonance sigil id,
- evidence chain hash,
- recommendation action,
- resonance score,
- drift pressure,
- confidence score.

## Validation
Verified locally:
- `npm run lint` passed
- `npm test -- --run` passed: 56/56
- `npm run build` passed

## Production Notes
Before enterprise production:
- persist audit records in a database,
- server-sign canonical hashes,
- add queue/worker processing for bulk and stream modes,
- add API auth and tenant isolation,
- add SLA monitoring,
- add immutable audit ledger storage.
