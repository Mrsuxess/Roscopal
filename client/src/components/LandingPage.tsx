import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Bot, 
  Lock, 
  TableProperties, 
  Globe2, 
  CheckCircle2, 
  Sparkles,
  Zap,
  Users2,
  DollarSign
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onExploreAI: () => void;
  onViewLedger: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onExploreAI,
  onViewLedger
}) => {
  const culturalCircles = [
    { name: 'Susu / Esusu / Ajo', origin: 'West Africa & Diaspora', desc: 'Trust-based rotating savings practiced by millions across Nigeria, Ghana, and diaspora communities.' },
    { name: 'Tanda / Cundina', origin: 'Latin America', desc: 'Family and neighborhood circles providing zero-interest community credit cycles.' },
    { name: 'Chit Fund', origin: 'India & South Asia', desc: 'Centuries-old rotating group auction and savings system powering small business capital.' },
    { name: 'Chama', origin: 'East Africa (Kenya, Uganda)', desc: 'Micro-savings investment groups driving local community projects and emergency relief.' },
    { name: 'Stokvel', origin: 'South Africa', desc: 'Over 800,000 community pools handling billions of rands annually.' },
    { name: 'Hui / Kye / Paluwagan', origin: 'East & Southeast Asia', desc: 'Rotating pot associations built on collective honor and mutual assistance.' },
  ];

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background Glow Mesh */}
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PayPal AI Hackathon 2026 Entry</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
              AI-Powered Treasurer for{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Rotating Savings Circles.
              </span>
            </h1>

            {/* Tagline & Subtitle */}
            <p className="text-xl sm:text-2xl text-slate-300 font-medium max-w-2xl mx-auto mb-4">
              Everyone Takes a Turn.
            </p>
            <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Automating contributions, polite late-payment chasing, policy grace extensions, turn swaps, and deterministic PayPal payouts — with every transaction secured by a SHA-256 cryptographic audit ledger in AG Grid.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onEnterApp}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all"
              >
                <span>Launch Organizer Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreAI}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-sm hover:scale-[1.02] transition-all"
              >
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>Test Conversational AI Setup</span>
              </button>

              <button
                onClick={onViewLedger}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-300 font-medium text-sm transition-all"
              >
                <TableProperties className="w-4 h-4 text-sky-400" />
                <span>Inspect AG Grid Ledger</span>
              </button>
            </div>

            {/* Guarantee Stats Bar */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl sm:text-2xl">
                  <ShieldCheck className="w-5 h-5" />
                  0
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  Out-of-Policy Payouts
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xl sm:text-2xl">
                  <Lock className="w-5 h-5" />
                  100%
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  SHA-256 Hash Chained
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xl sm:text-2xl">
                  <DollarSign className="w-5 h-5" />
                  $0
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  Crypto Wallets Required
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xl sm:text-2xl">
                  <Zap className="w-5 h-5" />
                  &lt; 3 mins
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  Hero Scenario Demo Time
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Global Tradition Section */}
      <section className="py-16 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Ancient Global Tradition · Modern Fintech Architecture
            </h2>
            <h3 className="text-3xl font-extrabold text-white">
              Every Culture Has a Savings Circle.
            </h3>
            <p className="mt-3 text-sm text-slate-400">
              Across continents, billions of people rely on rotating savings and credit associations (ROSCAs). They run on deep social trust and group chats — but collapse when someone must become an awkward debt collector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {culturalCircles.map((c, i) => (
              <div 
                key={i}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-base text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {c.name}
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full">
                    {c.origin}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution Architecture */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
            The ROSCOPAL Difference
          </h2>
          <h3 className="text-3xl font-extrabold text-white">
            The AI Proposes. The Rules Decide.
          </h3>
          <p className="mt-3 text-sm text-slate-400">
            Unlike experimental crypto projects or unverified chat bots, ROSCOPAL strictly separates natural-language social coordination from financial execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-lg text-white mb-2">1. Social AI Coordination</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Understands conversational circle setup, extension requests (&quot;I can only pay on the 15th&quot;), turn swaps, and payment disputes. Proposes actions with full context.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-lg text-white mb-2">2. Deterministic Safety Gate</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every payout must satisfy 8 strict deterministic policy rules. The AI can NEVER independently authorize money movement. Zero out-of-policy payouts guaranteed.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-5">
              <TableProperties className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-lg text-white mb-2">3. Immutable AG Grid Ledger</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every payment, approval, extension, and payout is cryptographically hashed with SHA-256 in a blockchain-style append-only ledger for total group transparency.
            </p>
          </div>
        </div>

        {/* Legal / Sandbox Disclosure Footer */}
        <div className="mt-16 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400">
          <p>
            <span className="font-semibold text-slate-300">Hackathon Disclosure:</span> ROSCOPAL demonstrates sandbox recurring contributions and payouts using the official PayPal Sandbox REST APIs. In commercial production, custody and settlement would be administered through appropriately licensed payment institution partners or a direct-to-recipient peer escrow architecture.
          </p>
        </div>
      </section>
    </div>
  );
};
