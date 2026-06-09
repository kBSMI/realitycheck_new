import type { TenantProfile } from '../../types/enterpriseRuntime';

export const LOCAL_PREVIEW_TENANT: TenantProfile = {
  id: 'tenant-local-preview',
  name: 'Local Preview Tenant',
  plan: 'beta',
  status: 'active',
  allowedInputModes: ['single', 'batch'],
  maxRecordsPerBatch: 250,
  maxEventsPerMinute: 60,
  defaultSlaClass: 'standard',
  createdAt: new Date(0).toISOString(),
};

export function canUseInputMode(tenant: TenantProfile, mode: 'single' | 'batch' | 'stream'): boolean {
  return tenant.status === 'active' && tenant.allowedInputModes.includes(mode);
}

export function canSubmitBatch(tenant: TenantProfile, recordCount: number): boolean {
  return canUseInputMode(tenant, 'batch') && recordCount <= tenant.maxRecordsPerBatch;
}
