import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createLocalSignedEnvelope, createServerSignedEnvelope, verifyLocalSignedEnvelope, verifyServerSignedEnvelope } from '../lib/serverSigning';
import { cloudPersistenceAvailable, signInWithMagicLink } from '../lib/supabaseClient';
import { getEntitlement, hasEntitlement, planAllows } from '../services/entitlementService';
import { canUnlockFullReport, unlockFullReport } from '../services/creditGateService';
import { supportCreditRepository } from '../services/repositories/supportCreditRepository';
import { createRealityCheckRepository } from '../services/repositories/realityCheckRepository';
import { scoreRealityCheck } from '../services/realityCheckService';
import { evaluateRateLimit, resetRateLimiter } from '../services/enterprise/rateLimiterService';
import { LOCAL_PREVIEW_TENANT } from '../services/enterprise/tenantPolicyService';
import { enqueueSMIJob, processSMIJob } from '../services/enterprise/jobQueueService';
import { advanceStreamCursor, getStreamCursor } from '../services/enterprise/streamOffsetService';
import { buildStripeCheckoutPayload, createCheckoutSession } from '../server/stripe/createCheckoutSession';
import { buildFulfillmentFromCheckoutSession, handleStripeWebhook, verifyStripeWebhookSignature } from '../server/stripe/stripeWebhook';
import { fulfillCheckout } from '../server/stripe/fulfillCheckout';
import { listSMIJobRecords, listStreamCursorRecords } from '../services/repositories/enterpriseRuntimeRepository';

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', { localStorage: localStorageMock });

beforeEach(() => {
  storage.clear();
  resetRateLimiter();
});

describe('production beta foundation', () => {
  it('keeps Supabase auth unavailable without client env and returns a useful magic-link error', async () => {
    expect(cloudPersistenceAvailable()).toBe(false);
    const result = await signInWithMagicLink('reviewer@example.com');
    expect(result.error).toContain('Supabase is not configured');
  });

  it('maps plan entitlements for beta gating', () => {
    const free = getEntitlement('u1', 'free');
    const enterprise = getEntitlement('u2', 'enterprise');
    expect(hasEntitlement(free, 'full_report_unlock')).toBe(false);
    expect(hasEntitlement(enterprise, 'stream_ingestion')).toBe(true);
    expect(planAllows('teams', 'batch_ingestion')).toBe(true);
  });

  it('blocks full report unlock when no credits or plan access exist', async () => {
    const decision = await canUnlockFullReport({ reportId: 'r1', userId: 'u1', entitlement: getEntitlement('u1', 'free') });
    expect(decision.allowed).toBe(false);
    expect(decision.creditsRequired).toBe(1);
  });

  it('unlocks full report with one support credit and writes ledger usage', async () => {
    await supportCreditRepository.addLedgerEntry({ userId: 'u1', kind: 'purchase', creditsDelta: 1, label: 'Test grant' });
    const receipt = await unlockFullReport({ reportId: 'r2', userId: 'u1', entitlement: getEntitlement('u1', 'free') });
    const balance = await supportCreditRepository.getBalance('u1');
    expect(receipt.unlocked).toBe(true);
    expect(balance.balance).toBe(0);
  });

  it('saves and retrieves a reality check through repository fallback', async () => {
    const repo = createRealityCheckRepository();
    const result = scoreRealityCheck({
      userGoal: 'Create a concise onboarding checklist for a founder.',
      originalPrompt: 'Write a concise checklist for a founder with five steps.',
      aiOutput: 'Founder checklist: 1. Define goal. 2. Gather data. 3. Build draft. 4. Review. 5. Launch.',
      sourcePlatform: 'ChatGPT',
      painPoints: [],
    });
    await repo.saveRealityCheck(result);
    const saved = await repo.getRealityCheck(result.id);
    expect(saved?.id).toBe(result.id);
    expect(saved?.smiEngineResult?.auditRecord.evidenceChainHash).toBeTruthy();
  });

  it('creates a local signed audit envelope that verifies deterministically', () => {
    const envelope = createLocalSignedEnvelope({ sigil: 'smi-test', score: 91 });
    expect(verifyLocalSignedEnvelope(envelope)).toBe(true);
    expect(envelope.note).toContain('Production');
  });

  it('creates and verifies server HMAC audit envelopes', async () => {
    const envelope = await createServerSignedEnvelope({ sigil: 'smi-test', score: 91 }, 'server-secret');
    expect(envelope.algorithm).toBe('hmac-sha256');
    expect(await verifyServerSignedEnvelope(envelope, 'server-secret')).toBe(true);
    expect(await verifyServerSignedEnvelope(envelope, 'wrong-secret')).toBe(false);
  });

  it('builds real Stripe Checkout Session payloads and creates sessions through an injected server fetch', async () => {
    const payload = buildStripeCheckoutPayload({
      userId: 'u1',
      planId: 'builder-support',
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
    });
    expect(payload?.metadata.planId).toBe('builder-support');

    const response = await createCheckoutSession({
      userId: 'u1',
      planId: 'builder-support',
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
    }, { stripeSecretKey: 'sk_test_123' }, async () => new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.test/session' }), { status: 200 }));

    expect(response.status).toBe('created');
    expect(response.sessionId).toBe('cs_test_1');
  });

  it('verifies Stripe webhook raw-body signatures and fulfills credit ledger entries', async () => {
    const rawBody = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_2', client_reference_id: 'u1', metadata: { planId: 'plus-monthly' } } },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const secret = 'whsec_test_secret';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`));
    const signature = Array.from(new Uint8Array(signatureBytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const header = `t=${timestamp},v1=${signature}`;

    expect(await verifyStripeWebhookSignature({ rawBody, signatureHeader: header, webhookSecret: secret })).toBe(true);
    const result = await handleStripeWebhook({ rawBody, signatureHeader: header, webhookSecret: secret });
    expect(result.verified).toBe(true);
    expect(result.ledgerEntry?.creditsDelta).toBe(30);
    const receipt = await fulfillCheckout(result);
    expect(receipt.credited).toBe(true);
    expect(receipt.entitled).toBe(true);
  });

  it('builds checkout fulfillment records without signature parsing for isolated unit tests', () => {
    const fulfillment = buildFulfillmentFromCheckoutSession({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_3', client_reference_id: 'u2', metadata: { planId: 'builder-support' } } },
    });
    expect(fulfillment.handled).toBe(true);
    expect(fulfillment.ledgerEntry?.kind).toBe('purchase');
  });

  it('enforces local tenant rate limits', () => {
    const tenant = { ...LOCAL_PREVIEW_TENANT, maxEventsPerMinute: 1 };
    expect(evaluateRateLimit(tenant).allowed).toBe(true);
    expect(evaluateRateLimit(tenant).allowed).toBe(false);
  });

  it('queues and processes an SMI enterprise job', () => {
    const job = enqueueSMIJob({
      tenantId: LOCAL_PREVIEW_TENANT.id,
      input: {
        userGoal: 'Verify the output preserves the requested source-backed format.',
        originalPrompt: 'Create a cited summary with sources.',
        aiOutput: 'The market increased by 40% and experts confirmed the policy risk is material.',
        inputType: 'text',
        ingestionMode: 'single',
        slaClass: 'standard',
        painPoints: ['source_trust_issue'],
      },
    });
    const processed = processSMIJob(job.id);
    expect(processed?.status).toBe('completed');
    expect(processed?.result?.reasonCodes).toContain('SOURCE_CONTEXT_EROSION');
    expect(listSMIJobRecords(LOCAL_PREVIEW_TENANT.id).some((item) => item.id === job.id)).toBe(true);
  });

  it('advances stream offsets with audit hash continuity', () => {
    const before = getStreamCursor('tenant-a', 'stream-1');
    const after = advanceStreamCursor({ tenantId: 'tenant-a', streamId: 'stream-1', sequence: 7, auditPayload: { event: 'x' } });
    expect(before.lastSequence).toBe(0);
    expect(after.lastSequence).toBe(7);
    expect(after.lastAuditHash).toMatch(/^fnv1a64-/);
    expect(listStreamCursorRecords('tenant-a')[0].lastSequence).toBe(7);
  });
});
