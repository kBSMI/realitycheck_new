import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, Anchor, BarChart3, BookLock, Clock, FileText, Gem, GitBranch,
  Home, Layers, LayoutDashboard, Lock, Network, Shield, ShieldCheck,
  Sparkles, Terminal, TestTube2, Users, Zap, Inbox, FlaskConical, Settings, Gauge, KeyRound,
} from 'lucide-react';
import type { AppShell } from './pages/LandingPage';
import { neuralTheme } from './styles/neuralTheme';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AIRealityCheck = lazy(() => import('./pages/AIRealityCheck'));
const MobileExperience = lazy(() => import('./pages/MobileExperience'));
const SupportCredits = lazy(() => import('./pages/SupportCredits'));
const SMITeams = lazy(() => import('./pages/SMITeams'));
const ReferenceArchitecture = lazy(() => import('./pages/ReferenceArchitecture'));
const RealityCheckHistory = lazy(() => import('./pages/RealityCheckHistory'));
const RealityCheckReportRoute = lazy(() => import('./pages/RealityCheckReportRoute'));
const ValidationDashboard = lazy(() => import('./pages/ValidationDashboard'));
const AIRealityIndex = lazy(() => import('./pages/AIRealityIndex'));
const PrivacyAndDataControls = lazy(() => import('./pages/PrivacyAndDataControls'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'));
const ScoringDisclaimerPage = lazy(() => import('./pages/ScoringDisclaimerPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkflowBaselines = lazy(() => import('./pages/WorkflowBaselines'));
const EventIngestion = lazy(() => import('./pages/EventIngestion'));
const ContinuityAnalysis = lazy(() => import('./pages/ContinuityAnalysis'));
const AuditLedger = lazy(() => import('./pages/AuditLedger'));
const PilotReport = lazy(() => import('./pages/PilotReport'));
const ServiceFramework = lazy(() => import('./pages/ServiceFramework'));
const F5ADSPSimulation = lazy(() => import('./pages/F5ADSPSimulation'));
const IngestionSimulator = lazy(() => import('./pages/IngestionSimulator'));
const PilotLifecycleDemo = lazy(() => import('./pages/PilotLifecycleDemo'));
const PilotTestScenarios = lazy(() => import('./pages/PilotTestScenarios'));
const PilotExecutionConsole = lazy(() => import('./pages/PilotExecutionConsole'));
const SMILoadTestLab = lazy(() => import('./pages/SMILoadTestLab'));
const EnvironmentSetupPage = lazy(() => import('./pages/EnvironmentSetupPage'));

type EnterprisePage = 'dashboard' | 'baselines' | 'events' | 'analysis' | 'audit' | 'report' | 'framework' | 'load-test-lab';
type DemoPage = 'f5adsp' | 'ingestion' | 'lifecycle' | 'scenarios' | 'console';

const shellPaths: Record<AppShell, string> = {
  landing: '/',
  consumer: '/reality-check',
  mobile: '/mobile',
  support: '/support-credits',
  teams: '/teams',
  enterprise: '/enterprise/dashboard',
  demo: '/demo/f5adsp',
  reference: '/architecture',
  history: '/history',
  validation: '/validation',
  index: '/index',
  privacy: '/privacy',
  auth: '/auth',
  pricing: '/pricing',
  terms: '/terms',
  refunds: '/refund',
  scoring: '/scoring-disclaimer',
  admin: '/admin',
};

const enterpriseItems: Array<{ id: EnterprisePage; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'baselines', label: 'Workflow Baselines', icon: <Anchor className="h-4 w-4" /> },
  { id: 'events', label: 'Event Ingestion', icon: <Zap className="h-4 w-4" /> },
  { id: 'analysis', label: 'Continuity Analysis', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'audit', label: 'Audit Ledger', icon: <BookLock className="h-4 w-4" /> },
  { id: 'report', label: 'Pilot Report', icon: <FileText className="h-4 w-4" /> },
  { id: 'framework', label: 'Service Framework', icon: <Layers className="h-4 w-4" /> },
  { id: 'load-test-lab', label: 'SMI Load Test Lab', icon: <Gauge className="h-4 w-4" /> },
];

const demoItems: Array<{ id: DemoPage; label: string; icon: React.ReactNode }> = [
  { id: 'f5adsp', label: 'F5 ADSP Simulation', icon: <Shield className="h-4 w-4" /> },
  { id: 'ingestion', label: 'Ingestion Simulator', icon: <Inbox className="h-4 w-4" /> },
  { id: 'lifecycle', label: 'Lifecycle Demo', icon: <FlaskConical className="h-4 w-4" /> },
  { id: 'scenarios', label: 'Test Scenarios', icon: <TestTube2 className="h-4 w-4" /> },
  { id: 'console', label: 'Exec Console', icon: <Terminal className="h-4 w-4" /> },
];

function useShellNavigate() {
  const navigate = useNavigate();
  return (shell: AppShell) => navigate(shellPaths[shell] ?? '/');
}

const LoadingFallback = () => (
  <div className={`${neuralTheme.shell} flex items-center justify-center text-sm text-neural-faint blur-to-focus`}>Loading...</div>
);

function MinimalShell({ title, icon, accentColor, children }: { title: string; icon: React.ReactNode; accentColor: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className={`${neuralTheme.shell} flex flex-col`}>
      <header className="arc-glass h-12 flex items-center px-4 gap-3 shrink-0 border-x-0 border-t-0 rounded-none">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-neural-faint hover:text-neural-secondary transition-colors duration-200 text-xs">
          <Home className="h-4 w-4" />
          <span className="hidden sm:block">Home</span>
        </button>
        <span className="text-white/15">/</span>
        <span className={accentColor}>{icon}</span>
        <h1 className="text-neural-primary text-sm font-semibold">{title}</h1>
        <div className="flex-1" />
        <button onClick={() => navigate('/auth')} className="text-neural-muted hover:text-white text-xs transition-colors duration-200">Sign in</button>
      </header>
      <main className="flex-1 overflow-auto p-4 lg:p-6 ink-dissolve">{children}</main>
    </div>
  );
}

function SidebarShell({ title, isDemo, children, nav }: { title: string; isDemo?: boolean; children: React.ReactNode; nav: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className={`${neuralTheme.shell} flex`}>
      <aside className="hidden lg:flex w-60 flex-col border-r border-white/10 bg-black/45 backdrop-blur-xl">
        <div className="h-14 border-b border-white/10 px-3 flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${isDemo ? 'border-neural-warning/40 bg-neural-warning/10' : 'border-white/15 bg-white/10'}`}>
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-bold">{isDemo ? 'SMI Demo' : 'SMI Enterprise'}</p>
            <p className="text-[9px] uppercase tracking-widest text-neural-faint">{isDemo ? 'Simulation' : 'Production'}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-auto p-2 space-y-1">{nav}</nav>
        <button onClick={() => navigate('/')} className="m-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-neural-faint hover:bg-white/8 hover:text-neural-secondary transition-colors duration-200">
          <Home className="h-3.5 w-3.5" />
          Home
        </button>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="arc-glass h-14 flex items-center gap-3 px-4 border-x-0 border-t-0 rounded-none">
          <Activity className={`h-4 w-4 ${isDemo ? 'text-neural-warning' : 'text-neural-silver'}`} />
          <h1 className="text-white text-sm font-semibold">{title}</h1>
          <div className="flex-1" />
          <button onClick={() => navigate('/admin')} className="arc-button-secondary p-2 text-neural-muted">
            <Settings className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4 lg:p-6 blur-to-focus">{children}</div>
      </main>
    </div>
  );
}

function NavButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-200 ${active ? 'bg-white text-black shadow-signal-white' : 'text-neural-muted hover:bg-white/8 hover:text-white'}`}>
      {children}
    </button>
  );
}

function normalizeEnterprise(page?: string): EnterprisePage {
  return enterpriseItems.some((item) => item.id === page) ? page as EnterprisePage : 'dashboard';
}

function EnterpriseShell() {
  const navigate = useNavigate();
  const page = normalizeEnterprise(useParams().page);
  const components: Record<EnterprisePage, React.ReactNode> = {
    dashboard: <Dashboard />,
    baselines: <WorkflowBaselines />,
    events: <EventIngestion />,
    analysis: <ContinuityAnalysis />,
    audit: <AuditLedger />,
    report: <PilotReport />,
    framework: <ServiceFramework />,
    'load-test-lab': <SMILoadTestLab />,
  };
  const nav = enterpriseItems.map((item) => (
    <NavButton key={item.id} active={item.id === page} onClick={() => navigate(`/enterprise/${item.id}`)}>
      {item.icon}<span>{item.label}</span>
    </NavButton>
  ));
  return <SidebarShell title={enterpriseItems.find((item) => item.id === page)?.label ?? 'Enterprise'} nav={nav}>{components[page]}</SidebarShell>;
}

function normalizeDemo(page?: string): DemoPage {
  return demoItems.some((item) => item.id === page) ? page as DemoPage : 'f5adsp';
}

function DemoShell() {
  const navigate = useNavigate();
  const page = normalizeDemo(useParams().page);
  const components: Record<DemoPage, React.ReactNode> = {
    f5adsp: <F5ADSPSimulation />,
    ingestion: <IngestionSimulator />,
    lifecycle: <PilotLifecycleDemo />,
    scenarios: <PilotTestScenarios />,
    console: <PilotExecutionConsole />,
  };
  const nav = demoItems.map((item) => (
    <NavButton key={item.id} active={item.id === page} onClick={() => navigate(`/demo/${item.id}`)}>
      {item.icon}<span>{item.label}</span>
    </NavButton>
  ));
  return <SidebarShell title={demoItems.find((item) => item.id === page)?.label ?? 'Demo'} isDemo nav={nav}>{components[page]}</SidebarShell>;
}

const RoutedLanding = () => <LandingPage onNavigate={useShellNavigate()} />;
const RoutedRealityCheck = () => <AIRealityCheck onNavigate={useShellNavigate()} />;
const RoutedMobile = () => <MobileExperience onNavigate={useShellNavigate()} />;
const RoutedSupport = () => <SupportCredits onNavigate={useShellNavigate()} />;

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<RoutedLanding />} />
        <Route path="/reality-check" element={<MinimalShell title="AI Reality Check" icon={<Sparkles className="h-4 w-4" />} accentColor="text-neural-primary"><RoutedRealityCheck /></MinimalShell>} />
        <Route path="/mobile" element={<MinimalShell title="Mobile Experience" icon={<Network className="h-4 w-4" />} accentColor="text-neural-silver"><RoutedMobile /></MinimalShell>} />
        <Route path="/support-credits" element={<MinimalShell title="Support Credits" icon={<Gem className="h-4 w-4" />} accentColor="text-neural-silver"><RoutedSupport /></MinimalShell>} />
        <Route path="/pricing" element={<MinimalShell title="Pricing" icon={<Gem className="h-4 w-4" />} accentColor="text-neural-primary"><PricingPage /></MinimalShell>} />
        <Route path="/auth" element={<MinimalShell title="Sign In" icon={<ShieldCheck className="h-4 w-4" />} accentColor="text-neural-primary"><AuthPage /></MinimalShell>} />
        <Route path="/auth/callback" element={<MinimalShell title="Secure Sign In" icon={<ShieldCheck className="h-4 w-4" />} accentColor="text-neural-primary"><AuthCallbackPage /></MinimalShell>} />
        <Route path="/teams" element={<MinimalShell title="SMI Teams" icon={<Users className="h-4 w-4" />} accentColor="text-neural-success"><SMITeams /></MinimalShell>} />
        <Route path="/architecture" element={<MinimalShell title="Reference Architecture" icon={<GitBranch className="h-4 w-4" />} accentColor="text-neural-cyan"><ReferenceArchitecture /></MinimalShell>} />
        <Route path="/history" element={<MinimalShell title="Reality Check History" icon={<Clock className="h-4 w-4" />} accentColor="text-neural-primary"><RealityCheckHistory /></MinimalShell>} />
        <Route path="/reports/:id" element={<MinimalShell title="Reality Check Report" icon={<FileText className="h-4 w-4" />} accentColor="text-neural-primary"><RealityCheckReportRoute /></MinimalShell>} />
        <Route path="/validation" element={<MinimalShell title="Validation Metrics" icon={<BarChart3 className="h-4 w-4" />} accentColor="text-neural-violet"><ValidationDashboard /></MinimalShell>} />
        <Route path="/index" element={<MinimalShell title="AI Reality Index" icon={<BarChart3 className="h-4 w-4" />} accentColor="text-neural-primary"><AIRealityIndex /></MinimalShell>} />
        <Route path="/privacy" element={<MinimalShell title="Privacy & Data Controls" icon={<Lock className="h-4 w-4" />} accentColor="text-neural-success"><PrivacyAndDataControls /></MinimalShell>} />
        <Route path="/privacy-policy" element={<MinimalShell title="Privacy Policy" icon={<Lock className="h-4 w-4" />} accentColor="text-neural-success"><PrivacyPolicyPage /></MinimalShell>} />
        <Route path="/terms" element={<MinimalShell title="Terms" icon={<FileText className="h-4 w-4" />} accentColor="text-neural-silver"><TermsPage /></MinimalShell>} />
        <Route path="/refund" element={<MinimalShell title="Refund Policy" icon={<Gem className="h-4 w-4" />} accentColor="text-neural-silver"><RefundPolicyPage /></MinimalShell>} />
        <Route path="/refunds" element={<Navigate to="/refund" replace />} />
        <Route path="/scoring-disclaimer" element={<MinimalShell title="Scoring Disclaimer" icon={<FileText className="h-4 w-4" />} accentColor="text-neural-silver"><ScoringDisclaimerPage /></MinimalShell>} />
        <Route path="/admin" element={<MinimalShell title="Admin Console" icon={<Settings className="h-4 w-4" />} accentColor="text-neural-cyan"><AdminPage /></MinimalShell>} />
        <Route path="/environment-setup" element={<MinimalShell title="Environment Setup" icon={<KeyRound className="h-4 w-4" />} accentColor="text-neural-warning"><EnvironmentSetupPage /></MinimalShell>} />
        <Route path="/load-test-lab" element={<MinimalShell title="SMI Load Test Lab" icon={<Gauge className="h-4 w-4" />} accentColor="text-neural-cyan"><SMILoadTestLab /></MinimalShell>} />
        <Route path="/enterprise" element={<Navigate to="/enterprise/dashboard" replace />} />
        <Route path="/enterprise/:page" element={<EnterpriseShell />} />
        <Route path="/demo" element={<Navigate to="/demo/f5adsp" replace />} />
        <Route path="/demo/:page" element={<DemoShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export type { AppShell };

