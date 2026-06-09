# SMI Production Enterprise Architecture v0.3

## Purpose

This layer turns the deterministic SMI Morphological Continuity Engine into a deployable beta/enterprise service architecture.

## Runtime lanes

1. **Interactive**: single-user UI checks, target latency under 900ms.
2. **Standard**: paid beta app checks with persisted reports and credits.
3. **Bulk**: batch enterprise evaluation for many records.
4. **Regulated**: stronger audit, retention, and signing posture.

## Input modes

- Single text checks.
- JSON/event/log/document records.
- Batch uploads.
- Streamed events with offset tracking.
- Historical replay.
- API/webhook ingestion.

## Trust model

- SMI resonance sigil: symbolic uniqueness and continuity signature.
- Canonical evidence hash: deterministic nested object fingerprint.
- Server signature: production cryptographic proof using server-only secret or KMS.
- Audit ledger: immutable-ish append-only persistence layer with reason codes, trinary decision, evidence chain hash, and sigil id.

## Production dependencies

- Supabase/Postgres for persistence and RLS.
- Stripe Checkout + webhooks for credits/subscriptions.
- Vercel/Netlify/serverless or a small API service for secret-bearing endpoints.
- Queue/worker infrastructure for batch/stream modes.
- Monitoring for latency, queue depth, error rate, and SLA violations.
