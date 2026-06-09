// ─── Reality Check Storage Service ───────────────────────────────────────────
// localStorage-backed persistence. All reads/writes are synchronous.

import type {
  RealityCheckResult,
  TeamComparisonResult,
  Testimonial,
  ImprovementCheckResult,
} from '../types/realityCheck';

const CHECKS_KEY      = 'smi_reality_checks';
const TEAMS_KEY       = 'smi_team_comparisons';
const TESTIMONIALS_KEY = 'smi_testimonials';
const IMPROVEMENTS_KEY = 'smi_improvements';

// ─── Generic CRUD helpers ─────────────────────────────────────────────────────

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, list: T[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

// ─── Reality Check CRUD ───────────────────────────────────────────────────────

export function saveCheck(result: RealityCheckResult): void {
  const existing = loadChecks();
  existing.unshift(result);
  saveList(CHECKS_KEY, existing);
}

export function loadChecks(): RealityCheckResult[] {
  return loadList<RealityCheckResult>(CHECKS_KEY);
}

export function removeCheck(id: string): void {
  saveList(CHECKS_KEY, loadChecks().filter((r) => r.id !== id));
}

export function clearAllChecks(): void {
  localStorage.removeItem(CHECKS_KEY);
}

// ─── Improvement Result CRUD ──────────────────────────────────────────────────

export function saveImprovement(result: ImprovementCheckResult): void {
  const existing = loadImprovements();
  existing.unshift(result);
  saveList(IMPROVEMENTS_KEY, existing);
}

export function loadImprovements(): ImprovementCheckResult[] {
  return loadList<ImprovementCheckResult>(IMPROVEMENTS_KEY);
}

export function loadImprovementForCheck(checkId: string): ImprovementCheckResult | null {
  return loadImprovements().find((r) => r.originalCheckId === checkId) ?? null;
}

export function clearAllImprovements(): void {
  localStorage.removeItem(IMPROVEMENTS_KEY);
}

// ─── Team Comparison CRUD ─────────────────────────────────────────────────────

export function saveTeamComparison(result: TeamComparisonResult): void {
  const existing = loadTeamComparisons();
  existing.unshift(result);
  saveList(TEAMS_KEY, existing);
}

export function loadTeamComparisons(): TeamComparisonResult[] {
  return loadList<TeamComparisonResult>(TEAMS_KEY);
}

export function removeTeamComparison(id: string): void {
  saveList(TEAMS_KEY, loadTeamComparisons().filter((r) => r.id !== id));
}

export function clearAllTeamComparisons(): void {
  localStorage.removeItem(TEAMS_KEY);
}

// ─── Testimonial CRUD ─────────────────────────────────────────────────────────

export function saveTestimonial(t: Testimonial): void {
  const existing = loadTestimonials();
  existing.unshift(t);
  saveList(TESTIMONIALS_KEY, existing);
}

export function loadTestimonials(): Testimonial[] {
  return loadList<Testimonial>(TESTIMONIALS_KEY);
}

export function removeTestimonial(id: string): void {
  saveList(TESTIMONIALS_KEY, loadTestimonials().filter((t) => t.id !== id));
}

export function clearAllTestimonials(): void {
  localStorage.removeItem(TESTIMONIALS_KEY);
}
