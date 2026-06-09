import React from 'react';
import {
  User, Users, Building2, BarChart3, GitBranch, Lock,
  ArrowRight, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { apiReadinessEndpoints } from '../docs/apiReadinessNotes';

// ─── Architecture card ────────────────────────────────────────────────────────

interface ArchCardProps {
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  title: string;
  subtitle: string;
  steps: string[];
  note?: string;
  noteVariant?: 'info' | 'warning' | 'success';
}

const ArchCard: React.FC<ArchCardProps> = ({
  icon, iconColor, borderColor, title, subtitle, steps, note, noteVariant = 'info',
}) => {
  const noteStyle = {
    info:    'bg-blue-900/10 border-blue-900/30 text-blue-300',
    warning: 'bg-amber-900/10 border-amber-900/30 text-amber-300',
    success: 'bg-green-900/10 border-green-900/30 text-green-300',
  }[noteVariant];

  return (
    <div className={`bg-gray-900/60 border ${borderColor} rounded-2xl p-5 flex flex-col gap-4`}>
      <div className="flex items-start gap-3">
        <div className={`${iconColor} p-2.5 rounded-xl shrink-0`}>{icon}</div>
        <div>
          <h3 className="text-white text-sm font-bold leading-tight">{title}</h3>
          <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 border border-gray-700 text-gray-500 text-[10px] font-bold mt-0.5">
              {i + 1}
            </span>
            <p className="text-gray-400 text-xs leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>

      {note && (
        <div className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${noteStyle}`}>
          {note}
        </div>
      )}
    </div>
  );
};

// ─── Service row ──────────────────────────────────────────────────────────────

const ServiceRow: React.FC<{ name: string; role: string; status: 'active' | 'pilot' | 'future' }> = ({
  name, role, status,
}) => {
  const badge = {
    active: 'bg-green-900/30 border-green-800/40 text-green-400',
    pilot:  'bg-cyan-900/30 border-cyan-800/40 text-cyan-400',
    future: 'bg-gray-800/60 border-gray-700/50 text-gray-500',
  }[status];

  const label = { active: 'Active', pilot: 'In Pilot', future: 'Future' }[status];

  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-900/40 rounded-xl border border-gray-800">
      <div>
        <p className="text-gray-300 text-xs font-semibold">{name}</p>
        <p className="text-gray-600 text-xs">{role}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>{label}</span>
    </div>
  );
};

// ─── Integration point ────────────────────────────────────────────────────────

const IntegPoint: React.FC<{ name: string; description: string; icon: React.ReactNode }> = ({
  name, description, icon,
}) => (
  <div className="flex items-start gap-3 px-3 py-3 bg-gray-900/40 rounded-xl border border-gray-800 border-dashed hover:border-gray-700 transition-colors">
    <span className="shrink-0 text-gray-600 mt-0.5">{icon}</span>
    <div>
      <p className="text-gray-400 text-xs font-semibold">{name}</p>
      <p className="text-gray-600 text-xs leading-relaxed">{description}</p>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const ReferenceArchitecture: React.FC = () => (
  <div className="space-y-8 max-w-6xl mx-auto">
    {/* Header */}
    <div>
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="h-5 w-5 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Reference Architecture</h2>
      </div>
      <p className="text-gray-400 text-sm">
        How SMI processes data across the three product lanes — consumer, team, and enterprise.
        All MVP flows are deterministic and local. No external AI calls are made.
      </p>
    </div>

    {/* Input flows */}
    <div>
      <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">Input Flows</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ArchCard
          icon={<User className="h-4 w-4 text-cyan-300" />}
          iconColor="bg-cyan-900/30 border border-cyan-800/40"
          borderColor="border-cyan-900/30"
          title="Consumer Input Flow"
          subtitle="AI Reality Check"
          steps={[
            'User provides goal, prompt, and AI output in a browser form',
            'Optional: expected format, target audience, source platform',
            'User selects pain points (missed intent, too generic, etc.)',
            'realityCheckService scores all 6 dimensions deterministically',
            'Grade, verdict, and next-best prompt rendered locally',
            'Result optionally persisted to browser localStorage',
          ]}
          note="No user data leaves the browser. All scoring runs in-process."
          noteVariant="success"
        />
        <ArchCard
          icon={<Users className="h-4 w-4 text-green-300" />}
          iconColor="bg-green-900/30 border border-green-800/40"
          borderColor="border-green-900/30"
          title="Team Baseline Comparison Flow"
          subtitle="SMI Teams"
          steps={[
            'User creates a project with a name',
            'User pastes a preferred baseline output and a new AI output',
            'scoreTeamConsistency computes keyword overlap and length similarity',
            'Consistency score, drift explanations, and correction prompt generated',
            'Reports saved to browser localStorage per project',
          ]}
          note="Comparison is text-similarity only — no semantic model required."
          noteVariant="info"
        />
        <ArchCard
          icon={<Building2 className="h-4 w-4 text-blue-300" />}
          iconColor="bg-blue-900/30 border border-blue-800/40"
          borderColor="border-blue-900/30"
          title="Enterprise Ingestion / API Flow"
          subtitle="SMI Enterprise"
          steps={[
            'AI workflow events ingested via smiIngestionService (validate → normalize → route)',
            'Normalized events fed into memoryMorphologyEngine for scoring',
            'Continuity score computed as 100 minus deductions from event table',
            'driftDetectionService surfaces named, categorized drift findings',
            'auditLedgerService writes hash-chained, append-only audit records',
            'pilotReportService aggregates session into XOps pilot report',
          ]}
          note="F5-style simulation connector demonstrates external system interoperability using synthetic data only."
          noteVariant="warning"
        />
      </div>
    </div>

    {/* SMI Engine services */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">SMI Engine Services</h3>
        <div className="space-y-2">
          <ServiceRow name="realityCheckService"       role="Consumer/team scoring — 6 dimensions, deterministic heuristics" status="active" />
          <ServiceRow name="realityCheckStorageService" role="localStorage CRUD for checks and team reports"                   status="active" />
          <ServiceRow name="smiIngestionService"       role="Intake validation, normalization, routing"                        status="active" />
          <ServiceRow name="memoryMorphologyEngine"    role="Continuity scoring against baseline anchor"                       status="active" />
          <ServiceRow name="driftDetectionService"     role="Named, categorized drift findings per workflow"                   status="active" />
          <ServiceRow name="auditLedgerService"        role="Hash-chained append-only audit ledger"                           status="active" />
          <ServiceRow name="pilotReportService"        role="XOps pilot report aggregation"                                    status="active" />
          <ServiceRow name="baselineService"           role="Baseline anchor capture and retrieval"                            status="active" />
          <ServiceRow name="commandExecutionService"   role="CLI-style command runner for pilot demo console"                  status="active" />
          <ServiceRow name="f5SimulationConnector"     role="F5-style simulated event generation and mapping"                  status="pilot" />
        </div>
      </div>

      <div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">Score / Report / Audit Outputs</h3>
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          {[
            { label: 'Reality Check Grade',    desc: 'A–F letter grade + 6 dimension scores',           icon: <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> },
            { label: 'Continuity Score',       desc: '0–100, deduction-based, maps to risk level',      icon: <BarChart3 className="h-3.5 w-3.5 text-blue-400" /> },
            { label: 'Team Consistency Score', desc: '0–100, keyword overlap + length similarity',      icon: <Users className="h-3.5 w-3.5 text-green-400" /> },
            { label: 'Drift Findings',         desc: 'Named, categorized, severity-rated findings',     icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> },
            { label: 'Audit Ledger Records',   desc: 'Hash-chained, append-only, tamper-evident',       icon: <Lock className="h-3.5 w-3.5 text-gray-400" /> },
            { label: 'Pilot Report',           desc: 'XOps-ready aggregated session summary',           icon: <Building2 className="h-3.5 w-3.5 text-gray-400" /> },
          ].map(({ label, desc, icon }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-gray-300 text-xs font-semibold">{label}</p>
                <p className="text-gray-600 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>



    {/* API readiness preview */}
    <div>
      <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">API Readiness Preview</h3>
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-gray-300 text-sm font-semibold">Future service endpoints</p>
          <p className="text-gray-600 text-xs mt-0.5">Contracts are typed in src/services/apiContracts.ts. No backend calls are implemented in this deterministic MVP.</p>
        </div>
        <div className="divide-y divide-gray-800">
          {apiReadinessEndpoints.map((endpoint) => (
            <div key={endpoint.path} className="grid grid-cols-1 md:grid-cols-[100px_240px_1fr_100px] gap-2 px-4 py-3 text-xs">
              <span className="font-mono text-cyan-400">{endpoint.method}</span>
              <span className="font-mono text-gray-300">{endpoint.path}</span>
              <span className="text-gray-500">{endpoint.purpose}</span>
              <span className="text-gray-600 capitalize">{endpoint.lane}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Future integration points */}
    <div>
      <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">Future Integration Points</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <IntegPoint
          icon={<ArrowRight className="h-4 w-4" />}
          name="AI Platform Adapters"
          description="Direct connectors to ChatGPT, Claude, Gemini APIs — submit prompt and receive output in one flow."
        />
        <IntegPoint
          icon={<ArrowRight className="h-4 w-4" />}
          name="Enterprise Event Ingestion API"
          description="REST/webhook endpoint for real AI gateway, guardrail, and red-team event streams."
        />
        <IntegPoint
          icon={<ArrowRight className="h-4 w-4" />}
          name="F5 ADSP Live Connector"
          description="Official integration with F5 ADSP event streams — requires F5 partnership and auth scope."
        />
        <IntegPoint
          icon={<ArrowRight className="h-4 w-4" />}
          name="Team Collaboration Backend"
          description="Shared project storage, role-based access, team baselines synced across members."
        />
        <IntegPoint
          icon={<ArrowRight className="h-4 w-4" />}
          name="Enterprise Audit Export"
          description="PDF/XLSX export of audit ledger records and pilot reports for compliance workflows."
        />
        <IntegPoint
          icon={<ArrowRight className="h-4 w-4" />}
          name="Semantic Scoring Engine"
          description="Embedding-based intent and continuity scoring to complement current heuristics."
        />
      </div>
    </div>

    {/* Privacy boundary */}
    <div className="bg-green-900/10 border border-green-800/30 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <Lock className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white text-sm font-bold mb-1">Privacy Boundary</h3>
          <p className="text-gray-400 text-xs leading-relaxed mb-3">
            In the current MVP, all processing runs entirely in the user's browser. No content is transmitted to any server, no accounts are required, and no session data is stored outside browser localStorage.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, text: 'User-provided content only — no scraping or passive collection' },
              { icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, text: 'No hidden platform access — no browser history, clipboard, or extension data' },
              { icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, text: 'No external AI calls — all scoring is deterministic and local' },
              { icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, text: 'No authentication required — no account, email, or identity collection' },
              { icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, text: 'localStorage is user-controlled — clearable at any time' },
              { icon: <AlertTriangle className="h-3 w-3 text-amber-500" />, text: 'Future API integration will require explicit consent and scoped data handling agreement' },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">{icon}</span>
                <p className="text-gray-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ReferenceArchitecture;

