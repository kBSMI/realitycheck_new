import React, { useState } from 'react';
import { ShieldCheck, Download, Trash2, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  clearAllChecks,
  clearAllImprovements,
  clearAllTeamComparisons,
  clearAllTestimonials,
  loadChecks,
  loadImprovements,
  loadTeamComparisons,
  loadTestimonials,
} from '../services/realityCheckStorageService';

function downloadAllLocalData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    checks: loadChecks(),
    improvements: loadImprovements(),
    teamComparisons: loadTeamComparisons(),
    testimonials: loadTestimonials(),
    note: 'Local MVP export. This file contains only data saved in this browser.',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-reality-check-local-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PrivacyAndDataControls: React.FC = () => {
  const [cleared, setCleared] = useState<string | null>(null);

  const handleClearChecks = () => {
    clearAllChecks();
    clearAllImprovements();
    setCleared('Saved checks and improvement checks deleted from this browser.');
  };

  const handleClearTestimonials = () => {
    clearAllTestimonials();
    setCleared('Testimonials deleted from this browser.');
  };

  const handleClearAll = () => {
    clearAllChecks();
    clearAllImprovements();
    clearAllTeamComparisons();
    clearAllTestimonials();
    setCleared('All local AI Reality Check data deleted from this browser.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-green-400" />
          <h2 className="text-2xl font-bold text-white">Privacy & Data Controls</h2>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          This MVP is designed as a local-first, user-provided-content experience. You control what is entered, saved, exported, or deleted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-white text-sm font-bold flex items-center gap-2"><Lock className="h-4 w-4 text-cyan-400" /> What this MVP analyzes</h3>
          {[
            'Your stated goal',
            'The prompt you paste',
            'The AI output you paste',
            'Optional expected format, audience, platform, and pain points',
            'Saved local checks, improvements, team reports, and testimonials',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
              <p className="text-gray-400 text-xs leading-relaxed">{item}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-white text-sm font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> What it does not do</h3>
          {[
            'Does not connect to ChatGPT, Claude, Gemini, Copilot, or Perplexity accounts',
            'Does not pull private AI sessions or browser history',
            'Does not scrape websites or hidden clipboard data',
            'Does not call external AI models in deterministic MVP mode',
            'Does not create public platform benchmark claims from local data',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
              <p className="text-gray-400 text-xs leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {cleared && (
        <div className="bg-green-900/10 border border-green-800/30 text-green-300 rounded-2xl p-4 text-sm">
          {cleared}
        </div>
      )}

      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white text-sm font-bold mb-3">Local Data Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={downloadAllLocalData} className="flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-colors">
            <Download className="h-4 w-4" /> Export All JSON
          </button>
          <button onClick={handleClearChecks} className="flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-3 rounded-xl transition-colors">
            <Trash2 className="h-4 w-4" /> Delete Checks
          </button>
          <button onClick={handleClearTestimonials} className="flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-3 rounded-xl transition-colors">
            <Trash2 className="h-4 w-4" /> Delete Testimonials
          </button>
          <button onClick={handleClearAll} className="flex items-center justify-center gap-2 bg-red-900/40 border border-red-800/50 hover:bg-red-900/60 text-red-200 text-xs font-semibold px-4 py-3 rounded-xl transition-colors">
            <Trash2 className="h-4 w-4" /> Delete All Local Data
          </button>
        </div>
      </div>

      <div className="bg-blue-900/10 border border-blue-800/30 rounded-2xl p-4">
        <p className="text-blue-200/80 text-xs leading-relaxed">
          Future account, API, workspace, or platform integrations should require explicit user authorization, scoped permissions, retention controls, and a clear delete/export path.
        </p>
      </div>
    </div>
  );
};

export default PrivacyAndDataControls;
