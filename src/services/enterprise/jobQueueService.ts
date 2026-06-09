import type { SMIQueueJob } from '../../types/enterpriseRuntime';
import type { SMIEngineInput, SMIEngineResult } from '../../types/smiEngine';
import { runSMIMorphologicalContinuityEngine } from '../smiEngine/morphologyEngine';
import { saveSMIJobRecord } from '../repositories/enterpriseRuntimeRepository';
import { recordSLAObservation } from './slaMonitorService';

const jobs = new Map<string, SMIQueueJob>();

export function enqueueSMIJob(params: {
  tenantId: string;
  input: SMIEngineInput;
  slaClass?: SMIEngineInput['slaClass'];
}): SMIQueueJob {
  const job: SMIQueueJob = {
    id: `job-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    tenantId: params.tenantId,
    input: params.input,
    status: 'queued',
    slaClass: params.slaClass ?? params.input.slaClass ?? 'standard',
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  void saveSMIJobRecord(job);
  return job;
}

export function processSMIJob(jobId: string): SMIQueueJob | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  const started = performance.now();
  job.status = 'processing';
  job.startedAt = new Date().toISOString();
  try {
    const result: SMIEngineResult = runSMIMorphologicalContinuityEngine(job.input);
    job.result = result;
    job.status = 'completed';
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown SMI job error.';
  } finally {
    job.completedAt = new Date().toISOString();
    recordSLAObservation(job.slaClass, performance.now() - started);
    jobs.set(job.id, job);
    void saveSMIJobRecord(job);
  }
  return job;
}

export function listSMIJobs(tenantId?: string): SMIQueueJob[] {
  return Array.from(jobs.values()).filter((job) => !tenantId || job.tenantId === tenantId);
}
