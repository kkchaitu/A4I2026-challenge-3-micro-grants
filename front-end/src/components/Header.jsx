import React from 'react';
import { 
  Building2, 
  Network, 
  MapPin, 
  FileText, 
  SlidersHorizontal, 
  Bot, 
  ShieldCheck, 
  DollarSign, 
  Layers,
  Sparkles,
  Award
} from 'lucide-react';

export function Header({
  corridors,
  activeCorridorId,
  onSelectCorridor,
  budget,
  onChangeBudget,
  activeTab,
  onSelectTab,
  strategyMode,
  onSetStrategyMode,
  agentOnline,
  onRefreshAgent
}) {
  const currentCorridor = corridors[activeCorridorId];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                Engine of <span className="text-emerald-400">Prosperity</span>
              </h1>
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                A4I 2026 // Challenge 3
              </span>
              <button
                onClick={onRefreshAgent}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 transition cursor-pointer ${
                  agentOnline
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                }`}
                title={agentOnline ? 'Agent connected on localhost:8000' : 'Click to test agent connection on localhost:8000'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${agentOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{agentOnline ? 'ADK Agent: Live' : 'Agent: Offline (Mock Engine)'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>San Francisco OEWD Economic Development</span>
              <span className="text-slate-600">•</span>
              <span>Economic Engines & Employment Multiplier Model</span>
            </p>
          </div>
        </div>

        {/* Corridor Selector & Budget Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Corridor Dropdown */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">Corridor:</span>
            <select
              value={activeCorridorId}
              onChange={(e) => onSelectCorridor(e.target.value)}
              className="bg-transparent border-none text-blue-300 font-semibold focus:outline-none cursor-pointer"
            >
              {Object.values(corridors).map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Quick Controller */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400 font-medium">Pool Budget:</span>
            <span className="font-mono font-bold text-emerald-300">${budget.toLocaleString()}</span>
            <input
              type="range"
              min="20000"
              max="150000"
              step="5000"
              value={budget}
              onChange={(e) => onChangeBudget(Number(e.target.value))}
              className="w-20 accent-emerald-500 h-1 cursor-pointer ml-1"
              title={`Adjust pool budget: $${budget.toLocaleString()}`}
            />
          </div>

          {/* Strategy Mode Pill */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onSetStrategyMode('resilience')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                strategyMode === 'resilience'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resilience Graph</span>
            </button>
            <button
              onClick={() => onSetStrategyMode('naive')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                strategyMode === 'naive'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-[11px]">Naive Distress</span>
            </button>
          </div>

          {/* External ADK Playground */}
          <div className="flex items-center gap-1.5">
            <a
              href="/dev-ui/?app=app"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-purple-500/30 flex items-center gap-1 transition"
              title="Open native Google ADK developer playground"
            >
              <span>ADK Dev Playground</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/80 overflow-x-auto py-1">
        {[
          { id: 'live-queue', label: 'Grant Decision Queue', icon: Sparkles, badge: 'Live GQL' },
          { id: 'judges-scoring', label: 'Judges Rubric & Scoring', icon: Award, badge: '103/110' },
          { id: 'funding-queue', label: 'Strategy Optimizer', icon: Layers },
          { id: 'network-graph', label: 'Cascade Network Graph', icon: Network },
          { id: 'map-view', label: 'Google Map & Geospatial View', icon: MapPin },
          { id: 'grant-memo', label: 'Official Grant Memo', icon: FileText, highlight: true },
          { id: 'what-if', label: 'Shock & Failure Simulator', icon: SlidersHorizontal },
          { id: 'ai-copilot', label: 'AI BigQuery Copilot', icon: Bot },
          { id: 'equity-audit', label: 'Tract Equity Audit', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              } ${tab.highlight && !isActive ? 'text-amber-400/90' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {tab.badge}
                </span>
              )}
              {tab.highlight && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Memo
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
