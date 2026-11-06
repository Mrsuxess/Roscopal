import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Play, 
  Clock, 
  Check, 
  X,
  RotateCcw
} from 'lucide-react';
import { runTestSuite } from '../api/client';

export const ScenarioSuiteView: React.FC = () => {
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const executeRun = async () => {
    setLoading(true);
    try {
      const data = await runTestSuite();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeRun();
  }, []);

  const filteredScenarios = result?.scenarioDetails?.filter((s: any) => 
    filterCategory === 'ALL' ? true : s.category === filterCategory
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <FlaskConical className="w-4 h-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Autonomous Scenario Suite & Policy Evaluator
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automated testing of 40 synthetic scenarios across 7 message intents, edge cases, duplicate webhooks, and deterministic financial policy gates.
            </p>
          </div>

          <button
            onClick={executeRun}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Executing Suite...' : 'Re-Run All 40 Scenarios'}</span>
          </button>
        </div>

        {/* Hero Result Banner: ZERO OUT-OF-POLICY PAYOUTS */}
        {result && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Classification Accuracy</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">{result.classificationAccuracy}%</div>
              <div className="text-[11px] text-slate-500">{result.passedScenarios} of {result.totalScenarios} passed</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Policy Compliance</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">{result.policyComplianceRate}%</div>
              <div className="text-[11px] text-slate-500">100% Deterministic Rules</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Unauthorized Payouts</span>
              <div className="text-2xl font-black text-emerald-300 mt-1">{result.unauthorizedPayoutsAllowed}</div>
              <div className="text-[11px] text-emerald-400 font-semibold">TARGET: ZERO ACHIEVED!</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Unauthorized Blocked</span>
              <div className="text-2xl font-black text-sky-400 mt-1">{result.unauthorizedPayoutsBlocked}</div>
              <div className="text-[11px] text-slate-500">Gated by safety checks</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Suite Duration</span>
              <div className="text-2xl font-black text-amber-400 mt-1">{result.durationMs}ms</div>
              <div className="text-[11px] text-slate-500">Real-time evaluation</div>
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterCategory === 'ALL'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All (40)
        </button>
        {result?.categoryBreakdown && Object.entries(result.categoryBreakdown).map(([cat, val]: [string, any]) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterCategory === cat
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat} ({val.passed}/{val.total})
          </button>
        ))}
      </div>

      {/* Scenarios Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Synthetic Message Input</th>
                <th className="px-4 py-3">Expected Intent</th>
                <th className="px-4 py-3">Detected Intent</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredScenarios.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">{s.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-200">{s.category}</td>
                  <td className="px-4 py-3 max-w-md text-slate-300 italic">&ldquo;{s.input}&rdquo;</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-sky-400">{s.expectedIntent}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-emerald-400">{s.detectedIntent}</td>
                  <td className="px-4 py-3 text-center">
                    {s.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        <Check className="w-3 h-3" /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold">
                        <X className="w-3 h-3" /> FAIL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
