# Codex Production Refinement Handoff

This build adds the remaining production/enterprise foundation as scaffolding while keeping the current StackBlitz/Vite app local-first and buildable.

## What is now present

- `.env.example` with client-safe Vite variables and server-only secrets.
- Supabase REST-compatible persistence adapters with local fallback.
- Auth preview hook/components/page.
- Repository layer for reality checks, improvement checks, support credits, and testimonials.
- Credit gating and entitlement service.
- Pricing catalog and Stripe Checkout/webhook/customer portal placeholders.
- Supabase migration for profiles, reports, credit ledger, payments, entitlements, enterprise tenants, API keys, jobs, stream offsets, and audit ledger.
- Enterprise runtime services: tenant policy, API key placeholder, rate limiting, job queue, stream cursor offsets, SLA observation.
- Policy/pricing route page scaffolds.
- Local audit signing envelope placeholder.
- Tests for repository fallback, credit gating, entitlements, local audit signing, queue processing, rate limiting, and stream offsets.

## Codex should refine next

1. Replace the REST-only Supabase shim with `@supabase/supabase-js` once dependencies can be installed.
2. Add true React Router URL routing and lazy route splitting using `APP_ROUTES` as the route map.
3. Wire `AuthPage`, `PricingPage`, `TermsPage`, `PrivacyPolicyPage`, `RefundPolicyPage`, and `ScoringDisclaimerPage` into navigation.
4. Move Stripe placeholder files to actual serverless endpoints for the chosen host.
5. Implement Stripe webhook signature verification with raw request body handling.
6. Fulfill `checkout.session.completed` into `support_credit_ledger` and `user_entitlements` using the service role key.
7. Replace local audit signing with server-side HMAC/SHA-256 or managed KMS signing.
8. Persist enterprise jobs, stream offsets, API keys, and audit ledger rows to Supabase/Postgres.
9. Add tenant-scoped RLS policies once team membership tables are introduced.
10. Add admin UI for tenant plans, API keys, job status, SLA observations, ledger corrections, and report disputes.

## Security boundaries

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SMI_AUDIT_SIGNING_SECRET`, or `SMI_API_KEY_PEPPER` in browser code.
- Browser-side hashes and signatures remain placeholders for local proof only.
- The resonance sigil is a symbolic/morphological continuity fingerprint, not a substitute for cryptographic proof.
- Production reports should include both the resonance sigil and a server-signed canonical evidence hash.

## Current intended architecture

The product should continue to operate in local fallback mode while Codex wires production infrastructure. The SMI engine remains deterministic and must not call an LLM as the scoring judge.
