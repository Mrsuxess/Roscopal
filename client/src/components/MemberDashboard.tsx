import React, { useState } from 'react';
import { 
  CreditCard, 
  Calendar, 
  ArrowRightLeft, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { User, Circle, CircleMember, Cycle, Contribution } from '../types';
import { simulateMemberPayment, sendAgentMessage } from '../api/client';

interface MemberDashboardProps {
  currentUser: User;
  circle: Circle | null;
  members: CircleMember[];
  cycles: Cycle[];
  contributions: Contribution[];
  onRefresh: () => void;
  onOpenAssistant: (initialPrompt?: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  currentUser,
  circle,
  members,
  cycles,
  contributions,
  onRefresh,
  onOpenAssistant
}) => {
  const currentCycle = cycles.find(c => c.cycle_number === (circle?.current_cycle_number || 1)) || cycles[0];
  const myMemberRecord = members.find(m => m.user_id === currentUser.id);

  // Check if current user has paid for current cycle
  const myCompletedContribution = contributions.find(
    c => c.member_id === myMemberRecord?.id && c.cycle_id === currentCycle?.id && c.status === 'completed'
  );

  const [paying, setPaying] = useState(false);

  const handlePayNow = async () => {
    if (!circle || !currentCycle || !myMemberRecord) return;
    setPaying(true);
    try {
      await simulateMemberPayment(circle.id, currentCycle.id, myMemberRecord.id);
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Circle Member Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">Location: {currentUser.location}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Member of {circle?.name || 'Global Diaspora Heritage Circle'} · PayPal: <span className="font-mono text-slate-300">{currentUser.paypal_email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              Your Turn: #{myMemberRecord?.turn_order || 'TBD'}
            </span>
          </div>
        </div>
      </div>

      {/* Contribution Obligation Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Payment Status Card */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Cycle #{currentCycle?.cycle_number || 1} Contribution</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                Due: {currentCycle?.due_date || 'Dec 1, 2026'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-400 font-medium">Your Required Amount</span>
                <span className="text-3xl font-black text-white">$100.00 <span className="text-sm font-normal text-slate-400">USD</span></span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Zero processing deductions. 100% of collected funds form the shared pot.
              </p>
            </div>
          </div>

          <div>
            {myCompletedContribution ? (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Contribution Confirmed via PayPal</span>
                </div>
                <div className="mt-2 text-xs font-mono text-slate-300">
                  Ref: {myCompletedContribution.paypal_capture_id || myCompletedContribution.paypal_order_id} · {myCompletedContribution.completed_at || 'Verified'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#003087] hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{paying ? 'Authorizing PayPal...' : 'Pay $100 with PayPal'}</span>
                </button>

                <button
                  onClick={() => onOpenAssistant(`I need an extension on my contribution for cycle ${currentCycle?.cycle_number}.`)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Request Grace Extension
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Turn Schedule Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white text-sm">Payout Recipient Schedule</h3>
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Current Pot Beneficiary</span>
                <div className="font-bold text-white text-sm mt-0.5">{currentCycle?.recipient_name}</div>
                <div className="text-xs text-slate-400">Target Pot: $800 USD (Turn #1)</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Scheduled Turn</span>
                <div className="font-bold text-slate-200 text-sm mt-0.5">Turn #{myMemberRecord?.turn_order}</div>
                <div className="text-xs text-slate-400">Estimated Pot Release: Cycle #{myMemberRecord?.turn_order}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => onOpenAssistant(`Can I exchange my turn #${myMemberRecord?.turn_order} with another member?`)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Request Turn Swap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Circle Announcements */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">Circle Transparency & Rules</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          This circle operates under strict deterministic policy rules: 5-day grace period, maximum 1 extension per member, and 100% pot collection condition prior to payout execution. All transactions are permanently audited using SHA-256 cryptographic hash-chaining.
        </p>
      </div>
    </div>
  );
};
