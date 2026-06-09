import React, { useState } from 'react';
import { Coins, Gem, Lock, Plus, ShieldCheck, Wallet } from 'lucide-react';
import GlassPanel from '../components/GlassPanel';
import NeuralBackdrop from '../components/NeuralBackdrop';
import RorschachLayer from '../components/RorschachLayer';
import QuestHeader from '../components/QuestHeader';
import IntentCore from '../components/IntentCore';
import MobileBottomNav from '../components/MobileBottomNav';
import type { AppShell } from './LandingPage';
import { dustThresholds, monthlyPlanPreviews, supportedDustTokens, supportCreditPacks } from '../data/supportCreditConfig';
import { getCreditBalance, loadCreditLedger, loadDustSupportRequests, saveDustSupportRequest, simulateCreditPackPurchase } from '../services/supportCreditService';

interface SupportCreditsProps {
  onNavigate: (shell: AppShell) => void;
}

const SupportCredits: React.FC<SupportCreditsProps> = ({ onNavigate }) => {
  const [balance, setBalance] = useState(() => getCreditBalance());
  const [requests, setRequests] = useState(() => loadDustSupportRequests());
  const [ledger, setLedger] = useState(() => loadCreditLedger());
  const [form, setForm] = useState({ tokenName: '', symbol: '', chain: '', contractAddress: '', sourceUrl: '', notes: '' });

  const simulatePurchase = (name: string, credits: number, price: string) => {
    simulateCreditPackPurchase(name, credits, price);
    setBalance(getCreditBalance());
    setLedger(loadCreditLedger());
  };

  const submitRequest = () => {
    if (!form.tokenName || !form.symbol || !form.chain) return;
    saveDustSupportRequest(form);
    setRequests(loadDustSupportRequests());
    setForm({ tokenName: '', symbol: '', chain: '', contractAddress: '', sourceUrl: '', notes: '' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-24 sm:pb-0">
      <NeuralBackdrop density="medium" centerGlow rorschach />
      <RorschachLayer variant="soft" opacity={0.1} />
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-10">
        <QuestHeader
          title="Support Credits & Dust Vault"
          subtitle="Preview is free. Full Reality Checks use Support Credits. In this local MVP, purchases and wallet flows are simulated only."
          activeStep={1}
          rightSlot={<div className="rounded-2xl bg-white text-black px-4 py-3 font-black">{balance} credits</div>}
        />

        <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-5 mb-5">
          <GlassPanel className="p-6 relative overflow-hidden">
            <RorschachLayer variant="dense" opacity={0.12} />
            <div className="relative">
              <IntentCore size="md" state="restore" score={balance} label="Credits" />
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/35 border border-white/10 p-4"><p className="text-xs text-zinc-500">Reality Level</p><p className="text-2xl font-black">12</p></div>
                <div className="rounded-2xl bg-black/35 border border-white/10 p-4"><p className="text-xs text-zinc-500">Insight XP</p><p className="text-2xl font-black">1,240</p></div>
              </div>
              <div className="mt-4 rounded-2xl bg-black/35 border border-white/10 p-4">
                <div className="flex justify-between text-xs mb-2"><span className="text-zinc-400">Public Launch Progress</span><span className="text-white">$4,280 / $10,000</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-[43%] rounded-full bg-white" /></div>
              </div>
            </div>
          </GlassPanel>

          <div className="grid sm:grid-cols-2 gap-4">
            {supportCreditPacks.map((pack) => (
              <GlassPanel key={pack.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/12 flex items-center justify-center"><Gem className="h-5 w-5" /></div>
                  <div className="text-right"><p className="text-2xl font-black">{pack.priceLabel}</p><p className="text-xs text-zinc-500">{pack.credits} credits</p></div>
                </div>
                <h3 className="font-black mt-4">{pack.name}</h3>
                <p className="text-sm text-zinc-500 mt-2 min-h-[40px]">{pack.description}</p>
                {pack.bestFor && <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 mt-3">{pack.bestFor}</p>}
                <button onClick={() => simulatePurchase(pack.name, pack.credits, pack.priceLabel)} className="mt-4 w-full rounded-2xl bg-white text-black px-4 py-3 text-sm font-bold hover:bg-zinc-200">
                  Simulate Unlock
                </button>
              </GlassPanel>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <GlassPanel className="p-5 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4"><Wallet className="h-5 w-5" /><h2 className="font-black text-xl">Dust Vault</h2></div>
            <p className="text-sm text-zinc-500 mb-4">Crypto Dust Support is limited to trusted networks and verified tokens. Unsupported tokens must be requested for private review before they can count toward redeemable value.</p>
            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              {supportedDustTokens.map((token) => (
                <div key={token.id} className="rounded-2xl bg-black/35 border border-white/10 p-4">
                  <p className="font-bold">{token.chain}</p>
                  <p className="text-sm text-zinc-400">{token.symbol}</p>
                  <p className="text-[10px] text-zinc-600 mt-2">Min redemption ${token.minRedeemableUsd}</p>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {dustThresholds.map((row) => (
                <div key={row.value} className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                  <p className="font-black">{row.value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{row.reward}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="flex items-center gap-3 mb-4"><ShieldCheck className="h-5 w-5" /><h2 className="font-black">Request Dust Support</h2></div>
            <div className="space-y-3">
              <input className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm" placeholder="Token name" value={form.tokenName} onChange={(e) => setForm({ ...form, tokenName: e.target.value })} />
              <input className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm" placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
              <input className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm" placeholder="Chain / network" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} />
              <input className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm" placeholder="Contract address optional" value={form.contractAddress} onChange={(e) => setForm({ ...form, contractAddress: e.target.value })} />
              <button onClick={submitRequest} className="w-full rounded-2xl bg-white text-black px-4 py-3 font-bold hover:bg-zinc-200 inline-flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Request Review</button>
            </div>
          </GlassPanel>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <GlassPanel className="p-5">
            <div className="flex items-center gap-3 mb-4"><Coins className="h-5 w-5" /><h2 className="font-black">Monthly Plan Preview</h2></div>
            <div className="space-y-3">
              {monthlyPlanPreviews.map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-black/35 border border-white/10 p-4 flex items-start justify-between gap-3">
                  <div><p className="font-bold">{plan.name}</p><p className="text-xs text-zinc-500">{plan.features.join(' • ')}</p></div>
                  <div className="text-right"><p className="font-black">{plan.priceLabel}</p><p className="text-xs text-zinc-500">{plan.creditsPerMonth}/mo</p></div>
                </div>
              ))}
            </div>
          </GlassPanel>
          <GlassPanel className="p-5">
            <div className="flex items-center gap-3 mb-4"><Lock className="h-5 w-5" /><h2 className="font-black">Safety Boundary</h2></div>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>Payments are not enabled in this local MVP.</li>
              <li>No wallet custody, no real stablecoin processing, and no unsupported token acceptance.</li>
              <li>Unsupported dust requests are private review requests only.</li>
              <li>Real Stripe, stablecoin, webhook, ledger, and tax/accounting handling belongs in the backend phase.</li>
            </ul>
          </GlassPanel>
        </div>

        {requests.length > 0 && (
          <GlassPanel className="p-5 mt-5">
            <h2 className="font-black mb-3">Pending Dust Support Requests</h2>
            <div className="space-y-2">
              {requests.map((request) => <p key={request.id} className="text-sm text-zinc-400">{request.tokenName} ({request.symbol}) on {request.chain} — pending review</p>)}
            </div>
          </GlassPanel>
        )}

        {ledger.length > 0 && (
          <GlassPanel className="p-5 mt-5">
            <h2 className="font-black mb-3">Local Credit Ledger</h2>
            <div className="space-y-2">
              {ledger.slice(0, 6).map((entry) => <p key={entry.id} className="text-sm text-zinc-400">{entry.label}: {entry.creditsDelta > 0 ? '+' : ''}{entry.creditsDelta} credits</p>)}
            </div>
          </GlassPanel>
        )}
      </main>
      <MobileBottomNav current="support" onNavigate={onNavigate} />
    </div>
  );
};

export default SupportCredits;
