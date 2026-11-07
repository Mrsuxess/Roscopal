import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { AIAssistant } from './components/AIAssistant';
import { LedgerGrid } from './components/LedgerGrid';
import { ScenarioSuiteView } from './components/ScenarioSuiteModal';
import { AuthModal } from './components/AuthModal';
import { CircleWizardModal } from './components/CircleWizardModal';
import { JoinCircleModal } from './components/JoinCircleModal';
import { 
  fetchCurrentUser, 
  fetchUsers, 
  switchUser, 
  fetchCircle, 
  fetchMembers, 
  fetchCycles, 
  fetchContributions, 
  resetDemo,
  fetchMyCircles,
  logoutAccount
} from './api/client';
import { User, Circle, CircleMember, Cycle, Contribution } from './types';
import { Users2, PlusCircle, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'assistant' | 'ledger' | 'scenarios'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [activeCircleId, setActiveCircleId] = useState<string>('circle-diaspora-8');

  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<string>('');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register'>('signin');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [initialInviteCode, setInitialInviteCode] = useState<string>('');

  const loadCircleData = async (targetCircleId: string) => {
    try {
      const [cData, mData, cyData, contrData] = await Promise.all([
        fetchCircle(targetCircleId),
        fetchMembers(targetCircleId),
        fetchCycles(targetCircleId),
        fetchContributions(targetCircleId)
      ]);

      if (cData.circle) {
        setCircle({
          ...cData.circle,
          policy: cData.policy || cData.circle.policy
        });
      }
      setMembers(mData.members || []);
      setCycles(cyData.cycles || []);
      setContributions(contrData.contributions || []);
    } catch (err) {
      console.error('Failed to load circle data:', err);
    }
  };

  const loadInitialData = async () => {
    try {
      const [uData, usersData] = await Promise.all([
        fetchCurrentUser(),
        fetchUsers()
      ]);

      setUsers(usersData.users || []);

      if (uData.isAuthenticated && uData.user) {
        setCurrentUser(uData.user);
        setIsAuthenticated(true);
        setIsDemoMode(false);
        setCurrentTab('dashboard');

        const circlesData = await fetchMyCircles(uData.user.id);
        const circles = circlesData.circles || [];
        setMyCircles(circles);

        if (circles.length > 0) {
          setActiveCircleId(circles[0].id);
          await loadCircleData(circles[0].id);
        } else {
          setActiveCircleId('circle-diaspora-8');
          await loadCircleData('circle-diaspora-8');
        }
      } else {
        // Unauthenticated visitor
        setCurrentUser(uData.user);
        setIsAuthenticated(false);
        setCurrentTab('landing');
        await loadCircleData('circle-diaspora-8');
      }

      // Check URL query parameters for invite code
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCodeParam = urlParams.get('invite');
      if (inviteCodeParam) {
        setInitialInviteCode(inviteCodeParam);
        setJoinModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await switchUser(userId);
      if (res.success) {
        setCurrentUser(res.user);
        await loadCircleData(activeCircleId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await resetDemo();
      setActiveCircleId('circle-diaspora-8');
      setIsDemoMode(true);
      await loadCircleData('circle-diaspora-8');
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

  const handleExploreDemo = async () => {
    setIsDemoMode(true);
    setActiveCircleId('circle-diaspora-8');
    setCurrentTab('dashboard');
    await loadCircleData('circle-diaspora-8');
  };

  const handleOpenAuth = (mode: 'signin' | 'register' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsDemoMode(false);
    setCurrentTab('dashboard');

    const circlesData = await fetchMyCircles(user.id);
    const circles = circlesData.circles || [];
    setMyCircles(circles);

    if (circles.length > 0) {
      setActiveCircleId(circles[0].id);
      await loadCircleData(circles[0].id);
    } else {
      // If user has no circles, open wizard
      setWizardOpen(true);
    }
  };

  const handleSignOut = async () => {
    await logoutAccount();
    setIsAuthenticated(false);
    setIsDemoMode(false);
    setCurrentTab('landing');
    const uData = await fetchCurrentUser();
    setCurrentUser(uData.user);
  };

  const handleCircleCreated = async (newCircle: Circle) => {
    const circlesData = await fetchMyCircles(currentUser?.id);
    setMyCircles(circlesData.circles || [newCircle]);
    setActiveCircleId(newCircle.id);
    setIsDemoMode(false);
    setCurrentTab('dashboard');
    await loadCircleData(newCircle.id);
  };

  const handleJoinedCircle = async (joinedCircle: Circle) => {
    const circlesData = await fetchMyCircles(currentUser?.id);
    setMyCircles(circlesData.circles || [joinedCircle]);
    setActiveCircleId(joinedCircle.id);
    setIsDemoMode(false);
    setCurrentTab('dashboard');
    await loadCircleData(joinedCircle.id);
  };

  const handleSelectCircle = async (circleId: string) => {
    setActiveCircleId(circleId);
    if (circleId === 'circle-diaspora-8') {
      setIsDemoMode(true);
    } else {
      setIsDemoMode(false);
    }
    await loadCircleData(circleId);
  };

  // Determine if current user is organizer of the active circle
  const isOrganizerOfActiveCircle = currentUser?.id === circle?.organizer_id;

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
        isAuthenticated={isAuthenticated}
        isDemoMode={isDemoMode}
        myCircles={myCircles}
        activeCircle={circle}
        onSelectCircle={handleSelectCircle}
        onCreateCircle={() => setWizardOpen(true)}
        onJoinCircle={() => setJoinModalOpen(true)}
        onOpenAuth={handleOpenAuth}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'landing' && (
          <LandingPage
            onCreateCircle={() => {
              if (!isAuthenticated) {
                handleOpenAuth('register');
              } else {
                setWizardOpen(true);
              }
            }}
            onJoinCircle={() => setJoinModalOpen(true)}
            onExploreDemo={handleExploreDemo}
            onSignIn={() => handleOpenAuth('signin')}
          />
        )}

        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Demo Banner */}
            {isDemoMode && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">Hero Demonstration Mode</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Seeded Diaspora Circle
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Exploring Ada Okonkwo&apos;s 8-member diaspora circle ($800 pot, Chidi Turn 1 payout). Use the persona selector in the navbar to switch between Organizer &amp; Member views.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setWizardOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs transition-all border border-emerald-500/30"
                  >
                    + Create My Own Circle
                  </button>
                </div>
              </div>
            )}

            {/* Empty State when user has no circles and not in demo */}
            {!isDemoMode && myCircles.length === 0 && !isOrganizerOfActiveCircle && (
              <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 max-w-2xl mx-auto my-8 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <Users2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Welcome, {currentUser?.name || 'Member'}!</h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                    You are not currently enrolled in any personal savings circles. Create a circle for your group or join with an invitation code.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setWizardOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-sm transition-all"
                  >
                    Create a Circle
                  </button>
                  <button
                    onClick={() => setJoinModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all border border-slate-700"
                  >
                    Join with Invite Code
                  </button>
                  <button
                    onClick={handleExploreDemo}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-sm transition-all border border-amber-500/20"
                  >
                    ⚡ Explore Hero Demo
                  </button>
                </div>
              </div>
            )}

            {/* Dashboards */}
            {(isDemoMode || myCircles.length > 0 || isOrganizerOfActiveCircle) && (
              isOrganizerOfActiveCircle ? (
                <OrganizerDashboard
                  circle={circle}
                  members={members}
                  cycles={cycles}
                  contributions={contributions}
                  onRefresh={() => loadCircleData(activeCircleId)}
                  onOpenLedger={() => setCurrentTab('ledger')}
                />
              ) : (
                <MemberDashboard
                  currentUser={currentUser}
                  circle={circle}
                  members={members}
                  cycles={cycles}
                  contributions={contributions}
                  onRefresh={() => loadCircleData(activeCircleId)}
                  onOpenAssistant={handleOpenAssistantWithPrompt}
                />
              )
            )}
          </div>
        )}

        {currentTab === 'assistant' && (
          <AIAssistant
            currentUser={currentUser}
            circle={circle}
            currentCycle={cycles.find(c => c.cycle_number === (circle?.current_cycle_number || 1)) || cycles[0]}
            members={members}
            contributions={contributions}
            onCircleCreated={() => loadCircleData(activeCircleId)}
            onNavigateToTab={(tab: string) => setCurrentTab(tab as any)}
            initialPrompt={assistantPrompt}
          />
        )}

        {currentTab === 'ledger' && (
          <LedgerGrid circleId={circle?.id || activeCircleId} />
        )}

        {currentTab === 'scenarios' && (
          <ScenarioSuiteView />
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      <CircleWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCircleCreated={handleCircleCreated}
        organizerId={currentUser?.id}
      />

      <JoinCircleModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoined={handleJoinedCircle}
        currentUser={currentUser}
        onRequireAuth={() => {
          setJoinModalOpen(false);
          handleOpenAuth('signin');
        }}
        initialCode={initialInviteCode}
      />

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
