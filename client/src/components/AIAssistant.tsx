import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  Clock,
  User as UserIcon,
  HelpCircle,
  Copy,
  CreditCard,
  Check,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { sendAgentMessage, confirmAiCircle, confirmAiExtension } from '../api/client';
import { User, Circle, CircleMember, Cycle, Contribution } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

interface AIAssistantProps {
  currentUser: User | null;
  circle: Circle | null;
  currentCycle?: Cycle | null;
  members?: CircleMember[];
  contributions?: Contribution[];
  onCircleCreated: () => void;
  onNavigateToTab?: (tab: string) => void;
  initialPrompt?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  intent?: string;
  actionRequired?: 'CONFIRM_CIRCLE_CREATION' | 'APPROVE_EXTENSION' | 'CONFIRM_SWAP' | 'NAVIGATE_CHECKOUT' | 'SHARE_INVITE' | 'NONE';
  structuredData?: any;
  engine?: string;
  timestamp: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  currentUser,
  circle,
  currentCycle,
  members = [],
  contributions = [],
  onCircleCreated,
  onNavigateToTab,
  initialPrompt
}) => {
  const isOrganizer = currentUser?.id === circle?.organizer_id;
  const myMember = members.find(m => m.user_id === currentUser?.id);
  const myPaid = contributions.some(c => c.member_id === myMember?.id && c.status === 'completed');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize personalized greeting
  useEffect(() => {
    const userName = currentUser?.name || 'Member';
    const circleName = circle?.name || 'Diaspora Heritage Circle';
    const currency = circle?.policy?.currency || 'USD';
    const amount = circle?.policy?.contribution_amount || 100;

    let welcomeText = `Hello **${userName}**! I am **ROSCOPAL**, your AI savings circle treasurer for **${circleName}**.\n\n`;

    if (isOrganizer) {
      welcomeText += `As the **Circle Organizer**, you can ask me to evaluate payout readiness, audit contribution receipts, monitor unpaid members, or generate invitation links for new members.`;
    } else if (myPaid) {
      welcomeText += `Your contribution of **${formatCurrency(amount, currency)}** for Cycle #${currentCycle?.cycle_number || 1} has already been verified on the ledger! You can ask about our pot funding progress, when your payout turn arrives, or request a turn swap.`;
    } else {
      welcomeText += `You have a pending contribution of **${formatCurrency(amount, currency)}** for Cycle #${currentCycle?.cycle_number || 1}. You can ask about payment options, due dates, or request a policy grace extension if you need more time.`;
    }

    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        content: welcomeText,
        engine: 'deterministic_contextual',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [currentUser?.id, circle?.id]);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Contextual Dynamic Prompts
  const getContextualPrompts = () => {
    if (isOrganizer) {
      return [
        "Why is the current payout blocked?",
        "How much has our circle collected?",
        "Who receives the next payout?",
        "How do I invite another member?",
        "What happens if someone misses a payment?"
      ];
    }
    if (!myPaid) {
      return [
        "How much do I owe for this cycle?",
        "When is my contribution due?",
        "Can I request a grace period extension?",
        "Who receives the next payout?",
        "How does ROSCOPAL work?"
      ];
    }
    return [
      "Verify my payment status and ledger ref",
      "How much has our circle collected?",
      "Who receives the next payout?",
      "When is my turn to receive the pot?",
      "Can I swap my turn with another member?"
    ];
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendAgentMessage(text, circle?.id || 'circle-diaspora-8');
      const assistantMsg: ChatMessage = {
        id: 'msg-ai-' + Date.now(),
        sender: 'assistant',
        content: res.message,
        intent: res.intent,
        actionRequired: res.actionRequired,
        structuredData: res.structuredData,
        engine: res.engine || 'deterministic_contextual',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          sender: 'assistant',
          content: 'I encountered an error connecting to the treasurer service. Please verify your connection and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Action Handlers
  const handleConfirmCircle = async (policy: any) => {
    setExecutingAction(true);
    try {
      const res = await confirmAiCircle(policy);
      if (res.success) {
        setMessages(prev => [
          ...prev,
          {
            id: 'msg-confirmed-' + Date.now(),
            sender: 'assistant',
            content: `🎉 **Circle Initialized!**\n• Circle ID: \`${res.circleId}\`\n• Policy locked and verified.\n• Genesis ledger block recorded on the cryptographic chain!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        onCircleCreated();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize circle');
    } finally {
      setExecutingAction(false);
    }
  };

  const handleConfirmExtension = async (data: any) => {
    setExecutingAction(true);
    try {
      const res = await confirmAiExtension(
        circle?.id || 'circle-diaspora-8',
        data.memberId,
        data.requestedDate,
        data.cycleId
      );
      if (res.success) {
        setMessages(prev => [
          ...prev,
          {
            id: 'msg-ext-confirmed-' + Date.now(),
            sender: 'assistant',
            content: `✅ **Grace Extension Confirmed & Logged!**\n• Payment due date extended to **${data.requestedDate}**\n• Grace period: ${data.evaluation?.graceDays || 5} days\n• Registered on the SHA-256 audit ledger. The circle pot release is held until contribution confirmation.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      alert(err.message || 'Extension failed');
    } finally {
      setExecutingAction(false);
    }
  };

  const handleCopyInvite = (code: string) => {
    const fullUrl = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="flex flex-col h-[750px] rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Assistant Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-sm">ROSCOPAL AI Treasurer</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Context
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Active Circle: <span className="text-slate-200 font-semibold">{circle?.name || 'Heritage Circle'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Deterministic Financial Rules
          </span>
        </div>
      </div>

      {/* Suggested Contextual Prompts */}
      <div className="p-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap pl-2">
          Suggestions:
        </span>
        {getContextualPrompts().map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="text-xs font-medium text-slate-300 hover:text-emerald-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 px-3 py-1 rounded-full whitespace-nowrap transition-all shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 border border-slate-700/60">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-950/30 font-medium'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-md whitespace-pre-line'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Structured Cards & Actions */}
                {!isUser && msg.structuredData && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                    {/* Circle Creation Proposal */}
                    {msg.actionRequired === 'CONFIRM_CIRCLE_CREATION' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="font-bold text-white">Proposed Circle Rules</span>
                          <span className="font-mono text-emerald-400 text-xs">
                            {formatCurrency(msg.structuredData.target_pot, msg.structuredData.currency)} Pot
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                          <div>Members: {msg.structuredData.members_count}</div>
                          <div>Cadence: {msg.structuredData.cadence}</div>
                          <div>Contribution: {formatCurrency(msg.structuredData.contribution_amount, msg.structuredData.currency)}</div>
                          <div>Grace Period: {msg.structuredData.grace_days} days</div>
                        </div>
                        <button
                          onClick={() => handleConfirmCircle(msg.structuredData)}
                          disabled={executingAction}
                          className="w-full mt-2 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          {executingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Confirm & Initialize Circle
                        </button>
                      </div>
                    )}

                    {/* Extension Request Approval */}
                    {msg.actionRequired === 'APPROVE_EXTENSION' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-300">
                          <span className="font-semibold">Provisional Extension Window</span>
                          <span className="font-mono text-purple-400">Due: {msg.structuredData.requestedDate}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Registering this extension preserves member good-standing and prevents automatic late default penalties.
                        </p>
                        <button
                          onClick={() => handleConfirmExtension(msg.structuredData)}
                          disabled={executingAction}
                          className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          {executingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                          Confirm Grace Extension
                        </button>
                      </div>
                    )}

                    {/* Member Checkout Navigation */}
                    {msg.actionRequired === 'NAVIGATE_CHECKOUT' && onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('dashboard')}
                        className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        Proceed to Member Dashboard & Checkout
                      </button>
                    )}

                    {/* Share Invite Code */}
                    {msg.actionRequired === 'SHARE_INVITE' && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="font-mono font-bold text-white text-xs">
                          {msg.structuredData?.inviteCode || circle?.invite_code || 'RSC-HERO01'}
                        </span>
                        <button
                          onClick={() => handleCopyInvite(msg.structuredData?.inviteCode || circle?.invite_code || 'RSC-HERO01')}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-all font-semibold"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className={`flex items-center gap-2 text-[10px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono">
                      Deterministic Engine · Verified
                    </span>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Checking deterministic policy rules & ledger records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about payments, turn order, why payout is blocked, or request extensions..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all shadow-md shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
