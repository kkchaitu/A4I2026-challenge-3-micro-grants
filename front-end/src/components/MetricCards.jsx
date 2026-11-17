import React from 'react';
import { DollarSign, Users, ShieldAlert, Sparkles, TrendingUp, MessageSquare, Bot } from 'lucide-react';

export function MetricCards({
  budget,
  allocated,
  directJobs,
  cascadeJobs,
  downstreamCount,
  strategyMode,
  onAskCopilot,
}) {
  const remaining = budget - allocated;
  const totalJobs = directJobs + cascadeJobs;
  const multiplier = directJobs > 0 ? (totalJobs / directJobs).toFixed(1) : '1.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Budget Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Relief Allocation</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            ${allocated.toLocaleString()}
            <span className="text-xs text-slate-500 font-normal ml-1">/ ${budget.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Remaining Pool:</span>
            <span className={`font-mono font-semibold ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${remaining.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remaining >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (allocated / budget) * 100)}%` }}
            />
          </div>
        </div>

        {onAskCopilot && (
          <button
            onClick={() => onAskCopilot(`How does our remaining $${remaining.toLocaleString()} budget pool maximize downstream job creation in this corridor?`)}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition text-left cursor-pointer"
          >
            <Bot className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Ask Copilot: Budget efficiency</span>
          </button>
        )}
      </div>

      {/* 2. Direct Jobs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Direct Grantee Jobs</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-400">
            {directJobs} <span className="text-xs text-slate-400 font-normal">payroll positions</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Immediate jobs preserved at funded storefronts
          </p>
        </div>

        {onAskCopilot && (
          <button
            onClick={() => onAskCopilot(`How does our model estimate the ${directJobs} direct jobs geographically from Census LEHD employer blocks?`)}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 hover:text-blue-300 flex items-center gap-1 transition text-left cursor-pointer"
          >
            <Bot className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="truncate">Ask Copilot: How jobs are modeled</span>
          </button>
        )}
      </div>

      {/* 3. Cascading Jobs Protected */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Cascading Jobs Shielded
            </span>
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300">
            +{cascadeJobs} <span className="text-xs text-indigo-400/80 font-normal">downstream jobs</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Buyers & contractors who depend on this supply
          </p>
        </div>

        {onAskCopilot && (
          <button
            onClick={() => onAskCopilot(`Explain how the BigQuery property graph multi-hop GQL traversal uncovers the +${cascadeJobs} cascading downstream jobs.`)}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition text-left cursor-pointer"
          >
            <Bot className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">Ask Copilot: GQL cascade logic</span>
          </button>
        )}
      </div>

      {/* 4. Downstream Businesses */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Protected Establishments</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {downstreamCount} <span className="text-xs text-slate-400 font-normal">local businesses</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Within 1 to 2 hops of supply & footfall linkages
          </p>
        </div>

        {onAskCopilot && (
          <button
            onClick={() => onAskCopilot(`Which ${downstreamCount} local establishments in this corridor depend most critically on our funded supply nodes?`)}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition text-left cursor-pointer"
          >
            <Bot className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">Ask Copilot: Supply linkages</span>
          </button>
        )}
      </div>

      {/* 5. Ripple Multiplier */}
      <div className={`border rounded-xl p-4 shadow-sm transition-all flex flex-col justify-between ${
        strategyMode === 'resilience'
          ? 'bg-blue-950/40 border-blue-800/80'
          : 'bg-amber-950/30 border-amber-800/60'
      }`}>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={strategyMode === 'resilience' ? 'text-blue-300 font-semibold' : 'text-amber-300'}>
              Resilience Multiplier
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              strategyMode === 'resilience' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {strategyMode === 'resilience' ? 'Graph Active' : 'Naive Mode'}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {multiplier}x <span className="text-xs text-slate-400 font-normal">impact ratio</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {strategyMode === 'resilience' 
              ? 'Each dollar protects direct + downstream supply stability'
              : 'Naive rank funds leaf nodes with ~1.0x ripple'}
          </p>
        </div>

        {onAskCopilot && (
          <button
            onClick={() => onAskCopilot(`Why does the ${multiplier}x resilience multiplier deliver superior job protection compared to naive distress ranking?`)}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-blue-300 hover:text-blue-200 flex items-center gap-1 transition text-left cursor-pointer"
          >
            <Bot className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="truncate">Ask Copilot: Why {multiplier}x multiplier beats naive</span>
          </button>
        )}
      </div>
    </div>
  );
}
