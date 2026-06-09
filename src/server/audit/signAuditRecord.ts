import type { SMIAuditRecord } from '../../types/smiEngine';
import { createServerSignedEnvelope } from '../../lib/serverSigning';

export async function signAuditRecord(record: SMIAuditRecord, signingSecret: string) {
  return createServerSignedEnvelope(record, signingSecret);
}
