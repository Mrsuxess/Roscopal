import React from 'react';
import { 
  ShieldCheck, 
  RotateCcw, 
  Bot, 
  TableProperties, 
  LayoutDashboard, 
  FlaskConical, 
  UserCheck, 
  Globe2, 
  CreditCard 
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentTab: 'landing' | 'dashboard' | 'assistant' | 'ledger' | 'scenarios';
  setCurrentTab: (tab: 'landing' | 'dashboard' | 'assistant' | 'ledger' | 'scenarios') => void;
  currentUser: User | null;
  users: User[];
  onSwitchUser: (userId: string) => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  users,
  onSwitchUser,
  onResetDemo,
  isResetting
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentTab('landing')}
              className="flex items-center gap-3 group text-left"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <span className="text-emerald-400 font-black text-lg tracking-wider">R</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    ROSCOPAL
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md">
                    PayPal AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Everyone Takes a Turn.</p>
              </div>
            </button>
          </div>

          {/* Nav items */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => setCurrentTab('assistant')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'assistant'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              AI Assistant
            </button>

            <button
              onClick={() => setCurrentTab('ledger')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'ledger'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TableProperties className="w-4 h-4 text-sky-400" />
              Audit Ledger (AG Grid)
            </button>

            <button
              onClick={() => setCurrentTab('scenarios')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'scenarios'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FlaskConical className="w-4 h-4 text-amber-400" />
              Scenario Suite
            </button>

            <button
              onClick={() => setCurrentTab('landing')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'landing'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe2 className="w-4 h-4" />
              Product Story
            </button>
          </nav>

          {/* Right Controls: Persona Switcher & Reset */}
          <div className="flex items-center gap-2">
            {/* Persona Switcher */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-none">
                  Active Persona
                </span>
                <select
                  value={currentUser?.id || ''}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer py-0.5"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                      {u.name} ({u.role === 'organizer' ? '👑 Organizer' : 'Member'}) — {u.location}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Hero Demo Button */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              title="Reset Hero Demo data back to starting state"
              className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
