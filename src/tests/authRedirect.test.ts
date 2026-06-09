import { describe, expect, it } from 'vitest';
import { getReturnToFromSearch, isSafeInternalPath, normalizeAuthReturnTo } from '../lib/authRedirect';

describe('auth redirect safety', () => {
  it('accepts normal internal routes', () => {
    expect(isSafeInternalPath('/history')).toBe(true);
    expect(normalizeAuthReturnTo('/reports/report-123')).toBe('/reports/report-123');
  });

  it('rejects external and protocol-relative redirects', () => {
    expect(isSafeInternalPath('https://evil.test')).toBe(false);
    expect(isSafeInternalPath('//evil.test/path')).toBe(false);
    expect(normalizeAuthReturnTo('https://evil.test')).toBe('/reality-check');
    expect(normalizeAuthReturnTo('//evil.test/path')).toBe('/reality-check');
  });

  it('avoids auth callback loops', () => {
    expect(normalizeAuthReturnTo('/auth')).toBe('/reality-check');
    expect(normalizeAuthReturnTo('/auth/callback?code=abc')).toBe('/reality-check');
  });

  it('reads a safe returnTo value from search params', () => {
    expect(getReturnToFromSearch('?returnTo=%2Fsupport-credits')).toBe('/support-credits');
    expect(getReturnToFromSearch('?returnTo=https%3A%2F%2Fevil.test')).toBe('/reality-check');
  });
});
