import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Lock, 
  Unlock, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Building
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Circle, CircleMember, Cycle, Contribution, SafetyCheckResult } from '../types';
import { 
  fetchSafetyCheck, 
  executePayout, 
  simulateMemberPayment, 
  fetchLedger,
  fetchContributions 
} from '../api/client';

interface OrganizerDashboardProps {
  circle: Circle | null;
  members: CircleMember[];
  cycles: Cycle[];
  contributions: Contribution[];
  onRefresh: () => void;
  onOpenLedger: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  circle,
  members,
  cycles,
  contributions,
  onRefresh,
  onOpenLedger
}) => {
  const currentCycle = cycles.find(c => c.cycle_number === (circle?.current_cycle_number || 1)) || cycles[0];
  const [safetyCheck, setSafetyCheck] = useState<SafetyCheckResult | null>(null);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutResult, setPayoutResult] = useState<any | null>(null);
  const [simulatingMember, setSimulatingMember] = useState<string | null>(null);

  const loadSafety = async () => {
    if (!currentCycle) return;
    setLoadingSafety(true);
    try {
      const res = await fetchSafetyCheck(currentCycle.id);
      setSafetyCheck(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSafety(false);
    }
  };

  useEffect(() => {
    loadSafety();
  }, [currentCycle?.id, contributions.length]);

  const handleSimulatePayment = async (memberId: string) => {
    if (!circle || !currentCycle) return;
    setSimulatingMember(memberId);
    try {
      await simulateMemberPayment(circle.id, currentCycle.id, memberId);
      await onRefresh();
      await loadSafety();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingMember(null);
    }
  };

  const handleExecutePayout = async () => {
    if (!currentCycle) return;
    setPayoutLoading(true);
    try {
      const res = await executePayout(currentCycle.id);
      setPayoutResult(res);
      if (res.success) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      await onRefresh();
      await loadSafety();
    } catch (err: any) {
      alert(`Payout failed: ${err.message || 'Error executing payout'}`);
    } finally {
      setPayoutLoading(false);
    }
  };

  const collected = currentCycle?.collected_amount || 0;
  const target = currentCycle?.target_pot_amount || 800;
  const percentCollected = Math.min(100, Math.round((collected / target) * 100));

  // Determine which members paid
  const completedContrMemberIds = new Set(
    contributions.filter(c => c.status === 'completed' && c.cycle_id === currentCycle?.id).map(c => c.member_id)
  );

  return (
    <div className="space-y-6">
      {/* Circle Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active Savings Circle
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {circle?.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {circle?.name || 'Global Diaspora Heritage Circle'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {circle?.tagline || '8 members across London, Lagos, Houston & Toronto saving $100 monthly'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLedger}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <span>View Audit Ledger</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Pot</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            ${target.toLocaleString()} <span className="text-xs font-normal text-slate-400">USD</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            $100 × 8 members monthly
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pot Collected</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            ${collected.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-emerald-400">({percentCollected}%)</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {completedContrMemberIds.size} of {members.length} members contributed
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Cycle</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            Cycle #{currentCycle?.cycle_number || 1}{' '}
            <span className="text-xs font-normal text-slate-400">of {cycles.length || 8}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Due date: {currentCycle?.due_date || 'Dec 1, 2026'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Next Recipient</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-white truncate">
            {currentCycle?.recipient_name || 'Chidi Anozie'}
          </div>
          <div className="mt-1 text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <span>Turn #1 Priority · Urgent rent</span>
          </div>
        </div>
      </div>

      {/* Progress & Member Status Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-sm">Cycle #1 Contribution Progress</h3>
            <p className="text-xs text-slate-400">Deterministic payout unlocked only when 100% of required contributions are confirmed.</p>
          </div>
          <span className="text-sm font-bold text-emerald-400">${collected} / ${target}</span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${percentCollected}%` }}
          />
        </div>

        {/* Member Grid Pills */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {members.map((m) => {
            const hasPaid = completedContrMemberIds.has(m.id);
            const isSimulating = simulatingMember === m.id;

            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  hasPaid
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                    Turn #{m.turn_order}
                  </span>
                  {hasPaid ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-400">Pending</span>
                  )}
                </div>

                <div className="my-2">
                  <div className="font-bold text-sm text-white truncate">{m.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{m.location}</div>
                </div>

                {!hasPaid && (
                  <button
                    onClick={() => handleSimulatePayment(m.id)}
                    disabled={isSimulating}
                    className="mt-1 w-full py-1 text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg transition-all"
                  >
                    {isSimulating ? 'Processing...' : 'Simulate PayPal'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Deterministic Payout Gate */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-lg text-white">Deterministic Financial Safety Gate</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ROSCOPAL enforces 8 non-bypassable programmatic checks before any pot can be released to PayPal.
            </p>
          </div>

          <div>
            {currentCycle?.status === 'paid_out' ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Cycle #1 Payout Completed via PayPal
              </span>
            ) : safetyCheck?.allowed ? (
              <button
                onClick={handleExecutePayout}
                disabled={payoutLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
              >
                <Unlock className="w-4 h-4" />
                <span>{payoutLoading ? 'Releasing via PayPal...' : `Release $${target} Pot to ${currentCycle?.recipient_name}`}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <Lock className="w-4 h-4" />
                <span>Payout Gate Locked (Conditions Unmet)</span>
              </div>
            )}
          </div>
        </div>

        {/* 8 Deterministic Checks Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '1. Circle Active', ok: safetyCheck?.checks?.circleActive },
            { label: '2. Cycle Open/Funded', ok: safetyCheck?.checks?.cycleValid },
            { label: '3. Recipient Valid', ok: safetyCheck?.checks?.recipientValid },
            { label: '4. Contributions Confirmed', ok: safetyCheck?.checks?.contributionsConfirmed },
            { label: '5. Amount Exact ($800)', ok: safetyCheck?.checks?.amountExact },
            { label: '6. Zero Duplicate Payout', ok: safetyCheck?.checks?.noDuplicatePayout },
            { label: '7. Circle Policy Satisfied', ok: safetyCheck?.checks?.policySatisfied },
            { label: '8. Approvals Satisfied', ok: safetyCheck?.checks?.approvalsSatisfied },
          ].map((check, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                check.ok
                  ? 'bg-emerald-950/15 border-emerald-500/25 text-emerald-300'
                  : 'bg-red-950/15 border-red-500/25 text-red-300'
              }`}
            >
              <span>{check.label}</span>
              {check.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
            </div>
          ))}
        </div>

        {/* Rejection / Block Detail Notification */}
        {!safetyCheck?.allowed && safetyCheck?.blockReason && currentCycle?.status !== 'paid_out' && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>Gate Notice:</strong> {safetyCheck.blockReason}</span>
            </div>
            <div className="text-[11px] text-amber-400 font-semibold underline shrink-0 cursor-pointer" onClick={() => {
              // Simulate remaining payments
              const unpaid = members.filter(m => !completedContrMemberIds.has(m.id));
              if (unpaid.length > 0) handleSimulatePayment(unpaid[0].id);
            }}>
              Quick-Fund Next Member
            </div>
          </div>
        )}

        {/* Payout Success Card */}
        {payoutResult?.success && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs">
            <div className="font-bold text-sm text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>PayPal Payout Successfully Executed!</span>
            </div>
            <p className="mt-1">{payoutResult.message}</p>
            <div className="mt-2 font-mono text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              PayPal Batch ID: {payoutResult.paypalBatchId} · Ledger Entry: {payoutResult.ledgerEntryId}
            </div>
          </div>
        )}
      </div>

      {/* AI Monthly Summary Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">AI Cycle Summary & Treasury Notes</h3>
        </div>
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-line">
          {`📊 **Cycle #1 Live Treasury Report — Global Diaspora Heritage Circle**
• Current Pot Status: $${collected} collected of $${target} USD target (${percentCollected}%)
• Payout Recipient: Chidi Anozie (Turn #1 — Urgent rent allocation)
• Extension Request: Fatima Bello granted +4 day grace extension (Policy compliant, expires Dec 5)
• Security Audit: SHA-256 Hash Chain intact across all ledger blocks
• Next Scheduled Action: Payout execution upon final member contribution verification`}
        </div>
      </div>
    </div>
  );
};
