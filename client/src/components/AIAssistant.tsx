import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  Clock,
  User,
  HelpCircle
} from 'lucide-react';
import { sendAgentMessage, confirmAiCircle } from '../api/client';
import { Circle } from '../types';

interface AIAssistantProps {
  circle: Circle | null;
  onCircleCreated: () => void;
  initialPrompt?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  intent?: string;
  actionRequired?: string;
  structuredData?: any;
  timestamp: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  circle,
  onCircleCreated,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: `Hello! I am **ROSCOPAL**, your AI treasurer for rotating savings circles.

You can ask me to:
• **Create a circle** ("Create a circle for 8 people, $100 monthly, Chidi needs the first pot for rent.")
• **Request extensions** ("I can only pay on the 5th this month.")
• **Request turn swaps** ("Can I exchange my turn with Chidi?")
• **Check payment status** ("I already paid my contribution on PayPal.")

How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [confirmingCircle, setConfirmingCircle] = useState(false);

  React.useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  const samplePrompts = [
    "Create a circle for 8 people. Everyone contributes $100 monthly, starting Dec 1. Chidi needs the first pot for rent.",
    "I can only pay on the 5th due to paycheck delay.",
    "Can I exchange my turn with Chidi?",
    "I already paid my $100 contribution this morning.",
    "Whose turn is it to receive the pot?"
  ];

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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          sender: 'assistant',
          content: 'Sorry, I encountered an issue processing your request.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCircle = async (policy: any) => {
    setConfirmingCircle(true);
    try {
      const res = await confirmAiCircle(policy);
      if (res.success) {
        setMessages(prev => [
          ...prev,
          {
            id: 'msg-confirmed-' + Date.now(),
            sender: 'assistant',
            content: `🎉 **Circle Successfully Initialized!**\n• Circle ID: \`${res.circleId}\`\n• 8-person monthly schedule locked\n• Chidi allocated Turn #1\n• Genesis ledger block recorded on the cryptographic chain!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        onCircleCreated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmingCircle(false);
    }
  };

  return (
    <div className="flex flex-col h-[750px] rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-white">ROSCOPAL AI Assistant</h2>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Treasurer
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Deterministic Guardrails · Zero Out-of-Policy Payouts</p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-semibold text-slate-400">Context Circle</span>
          <div className="text-xs font-bold text-slate-200">{circle?.name || 'Diaspora Heritage Circle'}</div>
        </div>
      </div>

      {/* Suggested Prompts Bar */}
      <div className="p-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0 px-2">Try:</span>
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="text-xs font-medium text-slate-300 hover:text-emerald-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 px-3 py-1 rounded-full whitespace-nowrap transition-all"
          >
            {p.slice(0, 48)}...
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-emerald-600 text-white font-medium rounded-br-none shadow-md'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
              }`}
            >
              <div className="whitespace-pre-line">{m.content}</div>

              {/* Special Interactive Card: Circle Setup Confirmation */}
              {m.actionRequired === 'CONFIRM_CIRCLE_CREATION' && m.structuredData && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Proposed Circle Rules & Policy
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">Review Before Activation</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-400">Members:</span> <strong className="text-white">{m.structuredData.members_count}</strong></div>
                    <div><span className="text-slate-400">Contribution:</span> <strong className="text-white">${m.structuredData.contribution_amount} {m.structuredData.currency}</strong></div>
                    <div><span className="text-slate-400">Cadence:</span> <strong className="text-white">{m.structuredData.cadence}</strong></div>
                    <div><span className="text-slate-400">Cycle Target Pot:</span> <strong className="text-emerald-400">${m.structuredData.target_pot} USD</strong></div>
                    <div><span className="text-slate-400">Grace Period:</span> <strong className="text-white">{m.structuredData.grace_days} days</strong></div>
                    <div><span className="text-slate-400">Payout Condition:</span> <strong className="text-white">{m.structuredData.payout_condition}</strong></div>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px]">
                    <span className="text-purple-400 font-semibold">Priority Allocations: </span>
                    {m.structuredData.priority_allocations?.map((p: any, idx: number) => (
                      <span key={idx}>Turn #{p.turn} → <strong>{p.memberName}</strong> ({p.reason})</span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleConfirmCircle(m.structuredData)}
                    disabled={confirmingCircle}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{confirmingCircle ? 'Activating Circle & Logging Genesis...' : 'Confirm & Initialize Circle'}</span>
                  </button>
                </div>
              )}

              <div className="mt-2 text-[10px] text-slate-500 text-right">
                {m.timestamp}
              </div>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
              ROSCOPAL is analyzing policy rules and preparing deterministic response...
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
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
            placeholder="Type your question or request (e.g. 'Can I swap turns with Chidi?')..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
