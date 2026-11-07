import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users2, 
  DollarSign, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  MapPin, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { fetchInvitationPreview, joinCircleWithCode } from '../api/client';
import { User, Circle } from '../types';
import { formatCurrency } from '../utils/currency';

interface JoinCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (circle: Circle) => void;
  currentUser: User | null;
  onRequireAuth: () => void;
  initialCode?: string;
}

export const JoinCircleModal: React.FC<JoinCircleModalProps> = ({
  isOpen,
  onClose,
  onJoined,
  currentUser,
  onRequireAuth,
  initialCode = ''
}) => {
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      handleSearch(initialCode);
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const handleSearch = async (codeToSearch?: string) => {
    const target = (codeToSearch || code).trim().toUpperCase();
    if (!target) return;

    setError(null);
    setLoading(true);
    setPreview(null);

    try {
      const data = await fetchInvitationPreview(target);
      if (data.error) throw new Error(data.error);
      setPreview(data);
    } catch (err: any) {
      setError(err.message || 'Invitation not found or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (!preview) return;

    setError(null);
    setJoining(true);

    try {
      const res = await joinCircleWithCode(preview.inviteCode || code, currentUser.id);
      if (res.error) throw new Error(res.error);
      onJoined(res.circle);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to join savings circle.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Join a Savings Circle</h3>
              <p className="text-xs text-slate-400">Enter an invitation code or paste link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Circle Invitation Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. RSC-8X9Y2A"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500/60 uppercase"
              />
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={loading || !code.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Find</span>
              </button>
            </div>
          </div>

          {/* Circle Preview Card */}
          {preview && (
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {preview.tradition}
                  </span>
                  <h4 className="font-extrabold text-lg text-white mt-1.5">{preview.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{preview.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Required Contribution</span>
                  <span className="text-base font-black text-white mt-0.5 block">
                    {formatCurrency(preview.contributionAmount, preview.currency)} {preview.currency}
                  </span>
                  <span className="text-[10px] text-slate-500">Every {preview.cadence}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Accumulated Pot</span>
                  <span className="text-base font-black text-emerald-400 mt-0.5 block">
                    {formatCurrency(preview.targetPot, preview.currency)} {preview.currency}
                  </span>
                  <span className="text-[10px] text-slate-500">{preview.maxMembers} turns total</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Organized by {preview.organizerName} ({preview.organizerLocation})</span>
                </div>
                <span className={`font-semibold ${preview.availableSlots > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {preview.availableSlots > 0 ? `${preview.availableSlots} slots left` : 'Circle is Full'}
                </span>
              </div>

              {preview.availableSlots === 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  This circle has filled all member capacity slots.
                </div>
              ) : !currentUser ? (
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:brightness-110 text-white font-bold text-xs transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sign In or Register to Join</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming Membership...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation & Join Circle</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
