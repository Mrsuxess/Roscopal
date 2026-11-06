import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { AIAssistant } from './components/AIAssistant';
import { LedgerGrid } from './components/LedgerGrid';
import { ScenarioSuiteView } from './components/ScenarioSuiteModal';
import { 
  fetchCurrentUser, 
  fetchUsers, 
  switchUser, 
  fetchCircle, 
  fetchMembers, 
  fetchCycles, 
  fetchContributions, 
  resetDemo 
} from './api/client';
import { User, Circle, CircleMember, Cycle, Contribution } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'assistant' | 'ledger' | 'scenarios'>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<string>('');

  const loadData = async () => {
    try {
      const [uData, usersData] = await Promise.all([
        fetchCurrentUser(),
        fetchUsers()
      ]);
      setCurrentUser(uData.user);
      setUsers(usersData.users || []);

      const circleId = 'circle-diaspora-8';
      const [cData, mData, cyData, contrData] = await Promise.all([
        fetchCircle(circleId),
        fetchMembers(circleId),
        fetchCycles(circleId),
        fetchContributions(circleId)
      ]);

      setCircle(cData.circle);
      setMembers(mData.members || []);
      setCycles(cyData.cycles || []);
      setContributions(contrData.contributions || []);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await switchUser(userId);
      if (res.success) {
        setCurrentUser(res.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await resetDemo();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenAssistantWithPrompt = (prompt?: string) => {
    if (prompt) setAssistantPrompt(prompt);
    setCurrentTab('assistant');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        users={users}
        onSwitchUser={handleSwitchUser}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'landing' && (
          <LandingPage
            onEnterApp={() => setCurrentTab('dashboard')}
            onExploreAI={() => setCurrentTab('assistant')}
            onViewLedger={() => setCurrentTab('ledger')}
          />
        )}

        {currentTab === 'dashboard' && (
          !currentUser ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 animate-pulse">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <span className="text-emerald-400 font-black text-xl">R</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">Loading ROSCOPAL Dashboard</p>
                <p className="text-xs text-slate-400">Verifying session and deterministic ledger state...</p>
              </div>
            </div>
          ) : currentUser.role === 'organizer' ? (
            <OrganizerDashboard
              circle={circle}
              members={members}
              cycles={cycles}
              contributions={contributions}
              onRefresh={loadData}
              onOpenLedger={() => setCurrentTab('ledger')}
            />
          ) : (
            <MemberDashboard
              currentUser={currentUser}
              circle={circle}
              members={members}
              cycles={cycles}
              contributions={contributions}
              onRefresh={loadData}
              onOpenAssistant={handleOpenAssistantWithPrompt}
            />
          )
        )}

        {currentTab === 'assistant' && (
          <AIAssistant
            circle={circle}
            onCircleCreated={loadData}
            initialPrompt={assistantPrompt}
          />
        )}

        {currentTab === 'ledger' && (
          <LedgerGrid circleId={circle?.id || 'circle-diaspora-8'} />
        )}

        {currentTab === 'scenarios' && (
          <ScenarioSuiteView />
        )}
      </main>

      {/* Fintech Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-300">ROSCOPAL</span>
            <span>—</span>
            <span>Everyone Takes a Turn</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>PayPal AI Hackathon 2026</span>
            <span>•</span>
            <span>AG Grid Verified</span>
            <span>•</span>
            <span>SHA-256 Cryptographic Chain</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
