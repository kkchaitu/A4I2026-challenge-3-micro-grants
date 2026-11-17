import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  AlertOctagon, 
  ShieldCheck, 
  TrendingDown, 
  TrendingUp, 
  Users, 
  DollarSign, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  Bot
} from 'lucide-react';
import { calculateDownstreamExposure, runNaiveStrategy, runResilienceStrategy } from '../utils/graphCalculations';

export function WhatIfSimulator({
  corridor,
  budget,
  onAskCopilot,
}) {
  const [closedBusinessIds, setClosedBusinessIds] = useState(['cm-01']); // Default closed: Merchant Roots
  
  const naiveResult = runNaiveStrategy(corridor, budget);
  const resilienceResult = runResilienceStrategy(corridor, budget);

  const toggleClosure = (id) => {
    if (closedBusinessIds.includes(id)) {
      setClosedBusinessIds(closedBusinessIds.filter(x => x !== id));
    } else {
      setClosedBusinessIds([...closedBusinessIds, id]);
    }
  };

  const resetSimulation = () => {
    setClosedBusinessIds(['cm-01']);
  };

  // Calculate cumulative shock from closed businesses
  let totalDirectJobsLost = 0;
  let totalCascadingJobsLost = 0;
  const directlyClosed = [];
  const cascadedClosed = new Map();

  closedBusinessIds.forEach(id => {
    const biz = corridor.businesses.find(b => b.id === id);
    if (biz) {
      directlyClosed.push(biz);
      totalDirectJobsLost += biz.jobs;
      const exp = calculateDownstreamExposure(id, corridor, 2);
      exp.downstreamList.forEach(d => {
        if (!cascadedClosed.has(d.business.id) && !closedBusinessIds.includes(d.business.id)) {
          cascadedClosed.set(d.business.id, d);
          totalCascadingJobsLost += d.business.jobs;
        }
      });
    }
  });

  const totalJobsLost = totalDirectJobsLost + totalCascadingJobsLost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100">
              Economic Shock & Cascade Failure Simulator
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold uppercase">
              Stress Testing
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulate what happens when key businesses close. Compare the defensive resilience of a graph-aware portfolio versus conventional distress rankings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAskCopilot && (
            <button
              onClick={() => onAskCopilot(`Simulate an economic shock if ${directlyClosed.map(b => b.name).join(', ')} closes. How many direct (${totalDirectJobsLost}) and cascading (${totalCascadingJobsLost}) jobs are at risk, and how does Resilience Strategy defend the corridor?`)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Converse with AI Copilot about this simulated shock"
            >
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span>Ask Copilot to Analyze Shock</span>
            </button>
          )}

          <button
            onClick={resetSimulation}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Simulation</span>
          </button>
        </div>
      </div>

      {/* Side-by-side Strategy Resilience Benchmark */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Naive Strategy Defense */}
        <div className="bg-slate-900 border border-amber-900/50 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                STRATEGY A: NAIVE RANKING
              </span>
              <h3 className="font-bold text-sm text-slate-100 mt-1">Fund Purely by Distress Score</h3>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-slate-400 block">BUDGET USED</span>
              <span className="font-bold text-slate-200">${(budget - naiveResult.remainingBudget).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Direct Jobs Protected:</span>
              <span className="font-mono font-bold text-blue-400">{naiveResult.directJobs} jobs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cascading Jobs Protected:</span>
              <span className="font-mono font-bold text-slate-500">+{naiveResult.cascadeJobs} jobs</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-200 font-semibold">Total Corridor Defense:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">{naiveResult.totalJobsProtected} jobs</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed bg-amber-950/20 p-3 rounded-xl border border-amber-800/40">
            <strong>Outcome:</strong> Funds terminal leaf storefronts. Upstream suppliers fail silently, leading to cascading insolvency for {resilienceResult.cascadeJobs} downstream jobs that were never visible on the application list.
          </div>
        </div>

        {/* Resilience Strategy Defense */}
        <div className="bg-slate-900 border border-blue-900/60 rounded-2xl p-5 space-y-4 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1 w-max">
                <Sparkles className="w-3 h-3" />
                STRATEGY B: RESILIENCE GRAPH
              </span>
              <h3 className="font-bold text-sm text-slate-100 mt-1">Multi-Hop Cascade Protection</h3>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-slate-400 block">BUDGET USED</span>
              <span className="font-bold text-slate-200">${(budget - resilienceResult.remainingBudget).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Direct Jobs Protected:</span>
              <span className="font-mono font-bold text-blue-400">{resilienceResult.directJobs} jobs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cascading Jobs Protected:</span>
              <span className="font-mono font-bold text-emerald-400">+{resilienceResult.cascadeJobs} jobs</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-200 font-semibold">Total Corridor Defense:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{resilienceResult.totalJobsProtected} jobs</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed bg-blue-950/30 p-3 rounded-xl border border-blue-800/40">
            <strong>Outcome:</strong> Secures vital wholesale and commercial commissaries. Generates a <strong>{(resilienceResult.totalJobsProtected / Math.max(1, naiveResult.totalJobsProtected)).toFixed(1)}x greater job protection return</strong> with zero wasted leaf allocation.
          </div>
        </div>
      </div>

      {/* Interactive Shock Testing Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>Interactive Business Closure Shock Tester</span>
          </h3>
          <span className="text-xs text-slate-400">
            Toggle closures below to witness ripple effects:
          </span>
        </div>

        {/* Business Toggle Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {corridor.businesses.map((b) => {
            const isClosed = closedBusinessIds.includes(b.id);
            const isCascaded = cascadedClosed.has(b.id);

            return (
              <button
                key={b.id}
                onClick={() => toggleClosure(b.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                  isClosed
                    ? 'bg-rose-950/50 border-rose-500/60 text-white'
                    : isCascaded
                    ? 'bg-amber-950/30 border-amber-700/50 text-amber-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-medium text-xs flex items-center gap-1.5">
                    <span>{b.dba || b.name}</span>
                    {isClosed && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                        CLOSED
                      </span>
                    )}
                    {isCascaded && !isClosed && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                        CASCADE SHOCKED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {b.jobs} jobs · {b.role.split(' ')[0]}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-mono ${isClosed ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                    {isClosed ? 'TRIGGER' : 'CLICK TO TEST'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Total Shock Damage Summary */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 block text-[10px]">DIRECT ESTABLISHMENTS LOST:</span>
              <span className="text-base font-bold text-rose-400">{directlyClosed.length} closed</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">DOWNSTREAM CASUALTIES:</span>
              <span className="text-base font-bold text-amber-400">+{cascadedClosed.size} shocked</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">TOTAL PAYROLL AT RISK:</span>
              <span className="text-base font-bold text-rose-400">{totalJobsLost} payroll positions</span>
            </div>
          </div>

          <div className="text-slate-400 text-[11px] max-w-sm text-right">
            Notice how closing one keystone supplier wipes out more jobs downstream than closing three leaf businesses combined.
          </div>
        </div>
      </div>
    </div>
  );
}
