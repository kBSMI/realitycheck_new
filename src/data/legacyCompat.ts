import { WorkflowDependency } from '../types/continuity';

// Dependency map expressed in SMI workflow ID space.
// Used by WorkflowDependencyMap component until Phase 3 migration.
export const mockDependencies: WorkflowDependency[] = [
  { sourceId: 'wf-001', targetId: 'wf-002', strength: 85, linkType: 'data-pipeline', active: true },
  { sourceId: 'wf-001', targetId: 'wf-003', strength: 45, linkType: 'audit-link', active: true },
  { sourceId: 'wf-001', targetId: 'wf-004', strength: 52, linkType: 'bridge-dependency', active: true },
  { sourceId: 'wf-001', targetId: 'wf-005', strength: 90, linkType: 'gateway-sync', active: true },
  { sourceId: 'wf-002', targetId: 'wf-003', strength: 30, linkType: 'feed-stale', active: false },
  { sourceId: 'wf-002', targetId: 'wf-005', strength: 78, linkType: 'enrichment-route', active: true },
  { sourceId: 'wf-004', targetId: 'wf-005', strength: 65, linkType: 'proxy-bridge', active: true },
];
