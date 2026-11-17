import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  Network, 
  FileText, 
  Building2, 
  Info,
  ExternalLink,
  ChevronRight,
  Bot
} from 'lucide-react';
import { calculateDownstreamExposure } from '../utils/graphCalculations';

export function FundingQueue({
  corridor,
  fundedIds,
  onToggleFund,
  onApplyResilienceStrategy,
  onApplyNaiveStrategy,
  onSelectBusinessForGraph,
  onSelectBusinessForMemo,
  strategyMode,
  onAskCopilot,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filtered = corridor.businesses.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.naicsLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.address.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterRole === 'all') return true;
    if (filterRole === 'keystone') return b.role.includes('Keystone') || b.role.includes('Hub') || b.role.includes('Anchor');
    if (filterRole === 'leaf') return b.role.includes('Leaf');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Strategy Explainer & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                Corridor Grant Queue & Allocation Strategy
              </h2>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                strategyMode === 'resilience'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {strategyMode === 'resilience' ? 'Graph Cascade Active' : 'Naive Distress Ranking'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              {strategyMode === 'resilience' ? (
                <span>
                  <strong className="text-blue-300">Resilience Allocation:</strong> Traverses multi-hop supply paths and B2B dependencies. Prioritizes keystone distributors whose survival protects downstream buyers, catering crews, and contractors.
                </span>
              ) : (
                <span>
                  <strong className="text-amber-300">Naive Distress Ranking (Section 2 Anti-pattern):</strong> Sorts solely by isolated distress score. Funds vulnerable leaf storefronts (dry cleaners, bookshops) while ignoring systemic collapse of upstream suppliers.
                </span>
              )}
            </p>
          </div>

          {/* Quick Strategy Action Buttons & Conversational Query */}
          <div className="flex flex-wrap items-center gap-2">
            {onAskCopilot && (
              <button
                onClick={() => onAskCopilot(`Why does the Resilience Strategy protect significantly more jobs than Naive Distress Ranking? Explain the graph ripple effect.`)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition flex items-center gap-1.5 cursor-pointer"
                title="Ask Copilot about strategy trade-offs"
              >
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                <span>Ask Copilot: Compare Strategies</span>
              </button>
            )}
            <button
              onClick={onApplyResilienceStrategy}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Resilience Strategy</span>
            </button>
            <button
              onClick={onApplyNaiveStrategy}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Naive Distress</span>
            </button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Filter by business name, address, or NAICS industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filter Role:</span>
            {['all', 'keystone', 'leaf'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                  filterRole === r
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
                }`}
              >
                {r === 'all' ? 'All Businesses' : r === 'keystone' ? 'Keystones & Hubs' : 'Leaf Nodes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Fund</th>
                <th className="py-3 px-4">Business & Address</th>
                <th className="py-3 px-4">NAICS Industry</th>
                <th className="py-3 px-4 text-center">Distress</th>
                <th className="py-3 px-4 text-right">Grant Request</th>
                <th className="py-3 px-4 text-center">Direct Jobs</th>
                <th className="py-3 px-4 text-center">Downstream Reach</th>
                <th className="py-3 px-4 text-center">Cascade Jobs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((b) => {
                const isFunded = fundedIds.includes(b.id);
                const exposure = calculateDownstreamExposure(b.id, corridor, 2);
                const isKeystone = b.role.includes('Keystone') || b.role.includes('Hub') || b.role.includes('Anchor');

                return (
                  <tr
                    key={b.id}
                    className={`transition-colors ${
                      isFunded
                        ? 'bg-blue-950/20 hover:bg-blue-950/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onToggleFund(b.id)}
                        className="cursor-pointer focus:outline-none"
                        title={isFunded ? 'Remove funding' : 'Approve grant'}
                      >
                        {isFunded ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                    </td>

                    {/* Name & Role */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{b.name}</span>
                        {isKeystone && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                            KEYSTONE
                          </span>
                        )}
                        {b.role.includes('Leaf') && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            LEAF
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{b.address}</div>
                    </td>

                    {/* NAICS */}
                    <td className="py-3 px-4">
                      <div className="text-slate-300 font-medium">{b.naicsLabel}</div>
                      <div className="text-[10px] text-slate-500 font-mono">NAICS {b.naics}</div>
                    </td>

                    {/* Distress Score */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`font-mono font-bold text-xs ${
                          b.distressScore >= 0.75
                            ? 'text-rose-400'
                            : b.distressScore >= 0.5
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                          {b.distressScore.toFixed(2)}
                        </span>
                        <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              b.distressScore >= 0.75
                                ? 'bg-rose-500'
                                : b.distressScore >= 0.5
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${b.distressScore * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Grant Requested */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200">
                      ${b.grantRequested.toLocaleString()}
                    </td>

                    {/* Direct Jobs */}
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {b.jobs}
                    </td>

                    {/* Downstream Reach */}
                    <td className="py-3 px-4 text-center">
                      {exposure.reachedCount > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-indigo-300">
                            {exposure.reachedCount} buyers
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {exposure.directCount} 1-hop · {exposure.twoHopCount} 2-hop
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">0 (leaf)</span>
                      )}
                    </td>

                    {/* Cascade Jobs */}
                    <td className="py-3 px-4 text-center">
                      {exposure.totalDownstreamJobs > 0 ? (
                        <span className="font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          +{exposure.totalDownstreamJobs} jobs
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectBusinessForGraph(b.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                          title="Inspect cascade traversal in graph"
                        >
                          <Network className="w-3 h-3" />
                          <span>Graph</span>
                        </button>
                        <button
                          onClick={() => onSelectBusinessForMemo(b.id)}
                          className="px-2 py-1 rounded bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 text-[11px] font-medium transition flex items-center gap-1 cursor-pointer border border-indigo-700/50"
                          title="Generate official Grant Memo for this applicant"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Memo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
