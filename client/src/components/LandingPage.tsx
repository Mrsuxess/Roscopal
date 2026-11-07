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
  DollarSign, 
  PlusCircle, 
  UserPlus, 
  Clock, 
  Calendar, 
  Scale, 
  ExternalLink 
} from 'lucide-react';

interface LandingPageProps {
  onCreateCircle: () => void;
  onJoinCircle: () => void;
  onExploreDemo: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateCircle,
  onJoinCircle,
  onExploreDemo,
  onSignIn
}) => {
  const culturalCircles = [
    { name: 'Susu / Esusu / Ajo', origin: 'West Africa & Global Diaspora', desc: 'Trust-based rotating savings practiced by millions across Nigeria, Ghana, the Caribbean, and global diaspora communities.' },
    { name: 'Tanda / Cundina', origin: 'Latin America & US Hispanic', desc: 'Family and neighborhood circles providing zero-interest community credit cycles across Mexico, Colombia, and Central America.' },
    { name: 'Chit Fund', origin: 'India & South Asia', desc: 'Centuries-old rotating group auction and savings system powering household capital and small business liquidity.' },
    { name: 'Chama', origin: 'East Africa (Kenya, Uganda, Tanzania)', desc: 'Micro-savings investment groups driving local community projects, emergency funds, and collective wealth.' },
    { name: 'Stokvel', origin: 'South Africa', desc: 'Over 800,000 community pools handling billions of rands annually with unyielding social accountability.' },
    { name: 'Hui / Paluwagan / Kye', origin: 'East & Southeast Asia', desc: 'Rotating pot associations built on collective honor and mutual assistance across the Philippines, China, and Korea.' },
  ];

  const howItWorksSteps = [
    {
      step: '01',
      title: 'Create Your Savings Circle',
      desc: 'Set the contribution amount, rotation cadence (weekly, bi-weekly, monthly), member count, and turn allocation rules in under 2 minutes.',
      icon: PlusCircle
    },
    {
      step: '02',
      title: 'Invite Trusted Members',
      desc: 'Share your private 6-character invitation code or join link with family, friends, or verified colleagues worldwide.',
      icon: UserPlus
    },
    {
      step: '03',
      title: 'Contribute Directly via PayPal',
      desc: 'Members pay their fixed portion securely through PayPal Checkout without manual bank transfers or awkward organizer chasing.',
      icon: DollarSign
    },
    {
      step: '04',
      title: 'Everyone Takes Their Turn',
      desc: 'Each cycle, 100% of accumulated funds are released to that round\'s scheduled beneficiary via automated PayPal payout.',
      icon: Calendar
    },
    {
      step: '05',
      title: 'Every Cent Cryptographically Tracked',
      desc: 'Every payment, extension, and payout is permanently appended to a tamper-proof SHA-256 hash-chained ledger in AG Grid.',
      icon: TableProperties
    }
  ];

  const safetyChecks = [
    { title: '1. Circle Status Active', desc: 'Circle must be confirmed active with verified membership rules.' },
    { title: '2. Open Cycle State', desc: 'Current cycle must be valid and ready for disbursement (not already paid).' },
    { title: '3. Valid Active Recipient', desc: 'Recipient member must be in good standing without departures.' },
    { title: '4. 100% Contributions Confirmed', desc: 'Zero unpaid members. Every single contributor must be verified.' },
    { title: '5. Exact Pot Match', desc: 'Collected amount must equal exactly members_count × contribution_amount.' },
    { title: '6. Duplicate Payout Lock', desc: 'Process-level mutex and database CAS lock guarantee zero double-disbursements.' },
    { title: '7. Policy Constraint Met', desc: 'Strict deterministic policy rules verified prior to API disbursement.' },
    { title: '8. Zero Blocking Disputes', desc: 'All pending extensions or payment disputes must be settled.' }
  ];

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-24 border-b border-slate-900">
        {/* Glow Mesh */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The AI-Powered Treasurer for Rotating Savings Groups</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-tight">
              Everyone Takes a Turn.{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent block mt-2">
                Zero Awkward Debt Chasing.
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-slate-300 font-normal max-w-3xl mx-auto mb-10 leading-relaxed">
              Around the world, billions rely on Susu, Tanda, Chit funds, Stokvel, and Chama. ROSCOPAL automates peer contributions, grace extensions, and pot releases using PayPal Sandbox and deterministic financial safeguards.
            </p>

            {/* Main CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onCreateCircle}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create a Savings Circle</span>
              </button>

              <button
                onClick={onJoinCircle}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-sm hover:scale-[1.02] transition-all"
              >
                <Users2 className="w-4 h-4 text-purple-400" />
                <span>Join with Code</span>
              </button>

              <button
                onClick={onExploreDemo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-emerald-500/30 text-emerald-300 font-semibold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Explore Hackathon Demo</span>
              </button>
            </div>

            {/* Quick Demo Logins Note */}
            <p className="text-xs text-slate-500 mt-4">
              Already have an account?{' '}
              <button onClick={onSignIn} className="text-emerald-400 hover:underline font-semibold">
                Sign In
              </button>{' '}
              or test with seeded demo personas.
            </p>

            {/* Guarantee Metrics Strip */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-2xl">
                  <ShieldCheck className="w-5 h-5" />
                  0
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  Out-of-Policy Payouts
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-2xl">
                  <Lock className="w-5 h-5" />
                  100%
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  SHA-256 Hash Chained
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-2xl">
                  <DollarSign className="w-5 h-5" />
                  $0
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  Crypto Wallets Required
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-2xl">
                  <Zap className="w-5 h-5" />
                  8 Rules
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  Deterministic Safety Gate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 block">
            Simple 5-Step Cycle
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            How ROSCOPAL Works
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            A frictionless coordination layer that respects social relationships while guaranteeing mathematical financial precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {howItWorksSteps.map((s, i) => (
            <div 
              key={i}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl font-black text-slate-600 block mb-3 font-mono">{s.step}</span>
                <s.icon className="w-6 h-6 text-emerald-400 mb-3" />
                <h3 className="font-bold text-white text-base mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Global Tradition Grid */}
      <section className="py-20 border-t border-slate-900 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 block">
              Global Heritage · Modern Fintech
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Every Culture Has a Savings Tradition
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              ROSCOPAL honors rotating savings traditions practiced worldwide, providing digital coordination for immigrant diaspora and close communities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {culturalCircles.map((c, i) => (
              <div 
                key={i}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base text-slate-100">{c.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                    {c.origin}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The 8 Payout Safety Checks */}
      <section id="trust-security" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2 block">
            Deterministic Financial Security
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            The 8 Non-Bypassable Payout Checks
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            AI coordinates members and proposes actions, but funds NEVER disburse unless all 8 deterministic policy rules evaluate to 100% true.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {safetyChecks.map((check, i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="font-bold text-sm text-white">{check.title}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-6">{check.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Callout Strip */}
      <section className="py-16 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-y border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Hackathon Judges
              </span>
              <span className="text-xs text-slate-400">Ada & Friends Diaspora Circle</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1">Explore the 8-Person Hero Scenario</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Experience the full flow: $800 pot, Chidi Turn 1 payout, 6 completed contributions, simulated PayPal Sandbox approvals, and real-time AG Grid ledger.
            </p>
          </div>

          <button
            onClick={onExploreDemo}
            className="shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Interactive Demo</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 font-bold">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs">
              R
            </div>
            <span>ROSCOPAL — Everyone Takes a Turn.</span>
          </div>

          <div className="text-center sm:text-right">
            <span>Built for the PayPal AI Hackathon 2026. Official Sandbox REST API & AG Grid.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
