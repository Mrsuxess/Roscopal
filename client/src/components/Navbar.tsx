import React, { useState } from 'react';
import { 
  ShieldCheck, 
  RotateCcw, 
  Bot, 
  TableProperties, 
  LayoutDashboard, 
  FlaskConical, 
  UserCheck, 
  Globe2, 
  CreditCard,
  PlusCircle,
  Users2,
  LogIn,
  LogOut,
  ChevronDown,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { User, Circle } from '../types';

interface NavbarProps {
  currentTab: 'landing' | 'dashboard' | 'assistant' | 'ledger' | 'scenarios';
  setCurrentTab: (tab: 'landing' | 'dashboard' | 'assistant' | 'ledger' | 'scenarios') => void;
  currentUser: User | null;
  users: User[];
  onSwitchUser: (userId: string) => void;
  onResetDemo: () => void;
  isResetting: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  myCircles: Circle[];
  activeCircle: Circle | null;
  onSelectCircle: (circleId: string) => void;
  onCreateCircle: () => void;
  onJoinCircle: () => void;
  onOpenAuth: (mode?: 'signin' | 'register') => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  users,
  onSwitchUser,
  onResetDemo,
  isResetting,
  isAuthenticated,
  isDemoMode,
  myCircles,
  activeCircle,
  onSelectCircle,
  onCreateCircle,
  onJoinCircle,
  onOpenAuth,
  onSignOut
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
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
                  {isDemoMode ? (
                    <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-md">
                      Demo Mode
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md">
                      Live Sandbox
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Everyone Takes a Turn.</p>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
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
              How It Works
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <button
              onClick={onCreateCircle}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Circle</span>
            </button>

            <button
              onClick={onJoinCircle}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-all"
            >
              <Users2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Join Circle</span>
            </button>

            {/* Circle Switcher (if user has circles) */}
            {myCircles && myCircles.length > 0 && (
              <div className="hidden xl:flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
                <select
                  value={activeCircle?.id || ''}
                  onChange={e => onSelectCircle(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer py-0.5 max-w-[150px] truncate"
                >
                  <option value="circle-diaspora-8" className="bg-slate-900 text-slate-200">
                    ⚡ Hero Demo Circle
                  </option>
                  {myCircles.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Demo Persona Switcher (when in Demo Mode) */}
            {isDemoMode && users && users.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 shadow-sm">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold leading-none">
                    Demo Persona
                  </span>
                  <select
                    value={currentUser?.id || ''}
                    onChange={(e) => onSwitchUser(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer py-0.5"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                        {u.name} ({u.role === 'organizer' ? '👑 Organizer' : 'Member'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Reset Demo Button (when in Demo Mode) */}
            {isDemoMode && (
              <button
                onClick={onResetDemo}
                disabled={isResetting}
                title="Reset Hero Demo data back to starting state"
                className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
              >
                <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            )}

            {/* Auth Button */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-tight">{currentUser?.name}</span>
                  <span className="text-[10px] text-slate-400">{currentUser?.location || 'Member'}</span>
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:flex px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => { onCreateCircle(); setMobileMenuOpen(false); }}
                className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Circle</span>
              </button>
              <button
                onClick={() => { onJoinCircle(); setMobileMenuOpen(false); }}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-purple-400 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Users2 className="w-4 h-4" />
                <span>Join Circle</span>
              </button>
            </div>

            <button
              onClick={() => { setCurrentTab('dashboard'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setCurrentTab('assistant'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => { setCurrentTab('ledger'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900"
            >
              <TableProperties className="w-4 h-4 text-sky-400" />
              <span>Audit Ledger (AG Grid)</span>
            </button>

            <button
              onClick={() => { setCurrentTab('scenarios'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900"
            >
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <span>Scenario Suite</span>
            </button>

            <button
              onClick={() => { setCurrentTab('landing'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900"
            >
              <Globe2 className="w-4 h-4" />
              <span>How It Works</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
