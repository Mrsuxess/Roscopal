import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Globe2, 
  Users2, 
  DollarSign, 
  Calendar, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  Share2 
} from 'lucide-react';
import { createCircleWizard } from '../api/client';
import { Circle } from '../types';

interface CircleWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCircleCreated: (circle: Circle) => void;
  organizerId?: string;
}

export const CircleWizardModal: React.FC<CircleWizardModalProps> = ({
  isOpen,
  onClose,
  onCircleCreated,
  organizerId
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tradition, setTradition] = useState('Susu / Esusu');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');

  const [contributionAmount, setContributionAmount] = useState<number>(100);
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [membersCount, setMembersCount] = useState<number>(8);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [graceDays, setGraceDays] = useState<number>(5);

  const [orderRule, setOrderRule] = useState<'draw_with_requests' | 'fixed_priority' | 'random_draw' | 'bidding'>('draw_with_requests');
  const [payoutCondition, setPayoutCondition] = useState<'all_paid' | 'majority_paid' | 'scheduled_date'>('all_paid');
  const [shortfallPolicy, setShortfallPolicy] = useState<'group_vote' | 'organizer_cover' | 'hold_payout'>('group_vote');

  // Completed State
  const [createdCircle, setCreatedCircle] = useState<Circle | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalPot = contributionAmount * membersCount;

  const traditionsList = [
    { name: 'Susu / Esusu / Ajo', region: 'West Africa & Diaspora' },
    { name: 'Tanda / Cundina', region: 'Latin America' },
    { name: 'Chama', region: 'East Africa' },
    { name: 'Stokvel', region: 'South Africa' },
    { name: 'Chit Fund', region: 'South Asia' },
    { name: 'Hui / Paluwagan', region: 'East & Southeast Asia' },
    { name: 'General Savings Circle', region: 'Global' }
  ];

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim() || name.trim().length < 3) {
        setError('Please enter a circle name with at least 3 characters.');
        return;
      }
    }
    if (step === 2) {
      if (contributionAmount <= 0) {
        setError('Contribution amount must be greater than 0.');
        return;
      }
      if (membersCount < 2 || membersCount > 50) {
        setError('Member count must be between 2 and 50.');
        return;
      }
    }
    setStep((prev) => (prev + 1) as any);
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => (prev - 1) as any);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await createCircleWizard({
        name,
        tradition,
        country,
        currency,
        isPublic,
        description,
        contributionAmount,
        cadence,
        membersCount,
        startDate,
        graceDays,
        orderRule,
        payoutCondition,
        shortfallPolicy,
        organizerId
      });

      if (res.error) throw new Error(res.error);

      setCreatedCircle(res.circle);
      setInviteCode(res.inviteCode);
      setStep(5); // Success step
    } catch (err: any) {
      setError(err.message || 'Failed to create savings circle.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?invite=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    if (createdCircle) {
      onCircleCreated(createdCircle);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Create a Savings Circle</h3>
              <p className="text-xs text-slate-400">
                {step === 5 ? 'Circle initialized & ready' : `Step ${step} of 4: Guided Setup Wizard`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        {step <= 4 && (
          <div className="h-1 bg-slate-800 w-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CIRCLE DETAILS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Circle Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. London Diaspora Heritage Susu"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Savings Tradition / Cultural Model
                  </label>
                  <select
                    value={tradition}
                    onChange={e => setTradition(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60"
                  >
                    {traditionsList.map(t => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Base Currency
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60"
                  >
                    <option value="USD">USD ($) — United States Dollar</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="CAD">CAD ($) — Canadian Dollar</option>
                    <option value="NGN">NGN (₦) — Nigerian Naira</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Group Description or Purpose
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the circle goals, rules, or community (e.g. Saving $100/mo for travel or business funding)."
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 resize-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-white block">Circle Privacy</span>
                  <span className="text-xs text-slate-400">
                    {isPublic ? 'Public — visible on discovery page' : 'Private — accessible only via invite link or code'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isPublic 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isPublic ? 'Public' : 'Private (Invite Only)'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONTRIBUTION RULES */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Individual Contribution Amount ({currency})
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min={1}
                      required
                      value={contributionAmount}
                      onChange={e => setContributionAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60 font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Each member contributes this exact sum per cycle.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Rotation Cadence
                  </label>
                  <select
                    value={cadence}
                    onChange={e => setCadence(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60"
                  >
                    <option value="monthly">Monthly (30 Days)</option>
                    <option value="biweekly">Bi-weekly (14 Days)</option>
                    <option value="weekly">Weekly (7 Days)</option>
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">How often one full pot is accumulated and paid.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Number of Members (Total Turns)
                  </label>
                  <div className="relative">
                    <Users2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      min={2}
                      max={50}
                      required
                      value={membersCount}
                      onChange={e => setMembersCount(Math.min(50, Math.max(2, Number(e.target.value))))}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60 font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Total rotation cycles = {membersCount} rounds.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Cycle #1 Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">When the first collection round officially opens.</span>
                </div>
              </div>

              {/* Dynamic Pot Calculation Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Accumulated Pot Per Cycle:</span>
                  <span className="text-2xl font-black text-emerald-400">
                    ${totalPot.toFixed(2)} <span className="text-xs font-normal text-slate-400">{currency}</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {membersCount} members × ${contributionAmount} = ${totalPot} paid to 1 beneficiary each {cadence}.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAYOUT & GOVERNANCE RULES */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Turn Order Allocation Policy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderRule('draw_with_requests')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      orderRule === 'draw_with_requests'
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm block">Peer Requests & Swaps</span>
                    <span className="text-xs text-slate-400 mt-1 block">Members request preferred turns based on personal need; swaps require mutual consensus.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderRule('fixed_priority')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      orderRule === 'fixed_priority'
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm block">Organizer Fixed Schedule</span>
                    <span className="text-xs text-slate-400 mt-1 block">Organizer pre-assigns all turn positions before cycle initiation.</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Payout Release Condition (Deterministic Gate)
                </label>
                <select
                  value={payoutCondition}
                  onChange={e => setPayoutCondition(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="all_paid">100% Fully Funded (All {membersCount} Members Must Have Paid)</option>
                  <option value="majority_paid">Majority Funded (At least 75% Paid + Organizer Guarantee)</option>
                  <option value="scheduled_date">Strict Scheduled Date (With Shortfall Escrow Hold)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Grace Period for Late Payments
                </label>
                <select
                  value={graceDays}
                  onChange={e => setGraceDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value={3}>3 Days Grace Period</option>
                  <option value={5}>5 Days Grace Period (Recommended)</option>
                  <option value={7}>7 Days Grace Period</option>
                  <option value={10}>10 Days Grace Period</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">Members can self-request 1 grace extension before late penalties trigger.</span>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium">Circle Name</span>
                  <span className="text-sm font-bold text-white">{name}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium">Tradition / Model</span>
                  <span className="text-sm font-semibold text-emerald-400">{tradition}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium">Target Pot Per Turn</span>
                  <span className="text-base font-black text-white">${totalPot.toFixed(2)} {currency}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium">Contribution / Member</span>
                  <span className="text-sm font-bold text-slate-200">${contributionAmount} {currency} / {cadence}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium">Total Turns / Duration</span>
                  <span className="text-sm font-bold text-slate-200">{membersCount} cycles</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Payout Safeguard</span>
                  <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    8 Deterministic Rules
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <p>
                  <span className="font-bold">Next Steps:</span> Once created, you will receive an invitation link and 6-character code. Your members can join in seconds and claim their scheduled turns.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS & INVITATION LINK */}
          {step === 5 && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-xl font-black text-white">Savings Circle Created!</h4>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  Your circle <span className="font-bold text-slate-200">{createdCircle?.name}</span> is live. Share this invitation link with your members:
                </p>
              </div>

              {/* Code Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Circle Invitation Code:</span>
                <div className="text-3xl font-mono font-black text-emerald-400 tracking-widest">
                  {inviteCode}
                </div>
                
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}?invite=${inviteCode}`}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          {step > 1 && step < 5 ? (
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : step === 4 ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Circle...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Confirm & Launch Circle</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-sm transition-all"
            >
              Enter Circle Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
