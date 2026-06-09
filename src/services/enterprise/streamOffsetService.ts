import type { StreamCursor } from '../../types/enterpriseRuntime';
import { stableObjectHash } from '../smiEngine/auditHashService';
import { saveStreamCursorRecord } from '../repositories/enterpriseRuntimeRepository';

const cursors = new Map<string, StreamCursor>();

function cursorKey(tenantId: string, streamId: string): string {
  return `${tenantId}:${streamId}`;
}

export function getStreamCursor(tenantId: string, streamId: string): StreamCursor {
  return cursors.get(cursorKey(tenantId, streamId)) ?? {
    tenantId,
    streamId,
    lastSequence: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

export function advanceStreamCursor(params: {
  tenantId: string;
  streamId: string;
  sequence: number;
  auditPayload?: unknown;
}): StreamCursor {
  const current = getStreamCursor(params.tenantId, params.streamId);
  const next: StreamCursor = {
    ...current,
    lastSequence: Math.max(current.lastSequence, params.sequence),
    lastAuditHash: params.auditPayload ? stableObjectHash(params.auditPayload) : current.lastAuditHash,
    updatedAt: new Date().toISOString(),
  };
  cursors.set(cursorKey(params.tenantId, params.streamId), next);
  void saveStreamCursorRecord(next);
  return next;
}
