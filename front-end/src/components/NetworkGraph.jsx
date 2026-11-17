import React, { useState } from 'react';
import { 
  Network, 
  MapPin,
  Info, 
  Sparkles, 
  AlertOctagon, 
  Layers, 
  Building2, 
  Briefcase, 
  FileCode2, 
  Check, 
  Copy,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { calculateDownstreamExposure } from '../utils/graphCalculations';

export function NetworkGraph({
  corridor,
  selectedBusinessId,
  onSelectBusiness,
  onGenerateMemo,
  onSwitchToMap
}) {
  const [selectedDepth, setSelectedDepth] = useState(2);
  const [activeEdgeFilter, setActiveEdgeFilter] = useState('all'); // 'all', 'supplies', 'footfall'
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const activeSeedId = selectedBusinessId || corridor.businesses[0].id;
  const seedBusiness = corridor.businesses.find(b => b.id === activeSeedId) || corridor.businesses[0];
  const exposure = calculateDownstreamExposure(activeSeedId, corridor, selectedDepth);

  // Layout node positions
  // We can calculate visually pleasant positions based on role & depth
  const nodePositions = {
    // Employer blocks
    'emp-01': { x: 120, y: 120, role: 'employer', label: 'Census Block (1,420 workers)' },
    'emp-02': { x: 120, y: 440, role: 'employer', label: 'Census Block (890 workers)' },
    'emp-24-01': { x: 120, y: 220, role: 'employer', label: 'SFGH Campus (1,650 workers)' },
    'emp-ct-01': { x: 120, y: 220, role: 'employer', label: 'FiDi Workforce (2,200 workers)' },

    // Central Market
    'cm-01': { x: 380, y: 240, role: 'keystone' }, // Merchant Roots
    'cm-02': { x: 380, y: 130, role: 'keystone' }, // Bayside Roasters
    'cm-03': { x: 380, y: 460, role: 'keystone' }, // Mid-Market Hardware
    'cm-04': { x: 620, y: 130, role: 'buyer' },    // Sixth St Cafe
    'cm-05': { x: 620, y: 260, role: 'buyer' },    // Yerba Deli
    'cm-06': { x: 620, y: 380, role: 'buyer' },    // Kearny Kitchen
    'cm-07': { x: 860, y: 380, role: 'leaf' },     // Larkin Event Hall
    'cm-08': { x: 860, y: 490, role: 'leaf' },     // Sunset Dry Cleaning
    'cm-09': { x: 860, y: 130, role: 'leaf' },     // Grove Street Books
    'cm-10': { x: 860, y: 240, role: 'leaf' },     // Marisol Flowers
    'cm-11': { x: 380, y: 30, role: 'leaf' },      // Mint Plaza Parking
    'cm-12': { x: 620, y: 480, role: 'buyer' },    // TL Contractors

    // 24th St
    '24-01': { x: 380, y: 220, role: 'keystone' },
    '24-02': { x: 380, y: 380, role: 'keystone' },
    '24-03': { x: 650, y: 220, role: 'buyer' },
    '24-04': { x: 650, y: 380, role: 'leaf' },

    // Chinatown
    'ct-01': { x: 380, y: 200, role: 'keystone' },
    'ct-02': { x: 380, y: 360, role: 'keystone' },
    'ct-03': { x: 650, y: 260, role: 'buyer' },
    'ct-04': { x: 650, y: 400, role: 'leaf' },
  };

  const gqlQuery = `GRAPH a4i_econ.LocalEconomy
MATCH p = ANY SHORTEST (seed:Business WHERE seed.name = '${seedBusiness.name}')
          -[:Supplies]->{1,${selectedDepth}}(exposed:Business)
RETURN TO_JSON(p) AS paths;`;

  const copyGql = () => {
    navigator.clipboard.writeText(gqlQuery);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  // Filter edges based on active filters
  const filteredEdges = corridor.edges.filter((e) => {
    if (activeEdgeFilter === 'supplies' && e.type !== 'Supplies') return false;
    if (activeEdgeFilter === 'footfall' && e.type !== 'DrawsFootfall') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Visualizer Header Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Left: Seed selector */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Trace Cascade From Seed:</div>
            <select
              value={activeSeedId}
              onChange={(e) => onSelectBusiness(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {corridor.businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.role.split(' ')[0]}) — {b.jobs} jobs
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Middle: Traversal Depth & Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Depth Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <span className="text-slate-400 px-2 font-medium">Depth:</span>
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDepth(d)}
                className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition ${
                  selectedDepth === d
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d} Hop{d > 1 ? 's' : ''}
              </button>
            ))}
          </div>

          {/* Edge Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {['all', 'supplies', 'footfall'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveEdgeFilter(f)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                  activeEdgeFilter === f
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'All Edges' : f}
              </button>
            ))}
          </div>

          {/* Simulate Failure Button */}
          <button
            onClick={() => setIsSimulatingFailure(!isSimulatingFailure)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
              isSimulatingFailure
                ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{isSimulatingFailure ? 'Closure Simulated' : 'Simulate Failure'}</span>
          </button>

          {/* Switch to Google Map View */}
          {onSwitchToMap && (
            <button
              onClick={onSwitchToMap}
              className="px-3 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 transition cursor-pointer font-medium"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Map View</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Interactive Graph & Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The SVG Graph Canvas */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[540px]">
          {/* Top Canvas Badges */}
          <div className="flex items-center justify-between z-10 pointer-events-none mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 pointer-events-auto">
                Corridor: {corridor.name}
              </span>
              <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 pointer-events-auto">
                {exposure.reachedCount} Downstream Reach
              </span>
            </div>

            {/* Edge Legend */}
            <div className="flex items-center gap-3 text-[10px] font-mono bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-xl">
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-2.5 h-0.5 bg-blue-400 inline-block" /> Supplies (B2B)
              </span>
              <span className="flex items-center gap-1 text-pink-400">
                <span className="w-2.5 h-0.5 border-t border-pink-400 border-dashed inline-block" /> Footfall
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> SBA Loan
              </span>
            </div>
          </div>

          {/* Failure Alert Banner if Simulating */}
          {isSimulatingFailure && (
            <div className="z-10 bg-rose-950/80 border border-rose-500/50 p-2.5 rounded-xl text-xs text-rose-200 flex items-center justify-between mb-2 animate-pulse">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>SIMULATION RUNNING:</strong> If <strong>{seedBusiness.name}</strong> closes, {exposure.reachedCount} downstream buyers lose supply, placing <strong>{exposure.totalDownstreamJobs} payroll jobs</strong> at immediate risk.
                </span>
              </div>
            </div>
          )}

          {/* SVG Graph Visualization */}
          <div className="w-full flex-1 relative flex items-center justify-center">
            <svg
              viewBox="0 0 960 560"
              className="w-full h-full max-h-[500px] select-none"
            >
              <defs>
                {/* Arrow markers */}
                <marker
                  id="arrow-supplies"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
                <marker
                  id="arrow-footfall"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ec4899" />
                </marker>
                <marker
                  id="arrow-shock"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Render Edges */}
              {filteredEdges.map((edge) => {
                const sPos = nodePositions[edge.source];
                const tPos = nodePositions[edge.target];
                if (!sPos || !tPos) return null;

                const isConnectedToSeed = edge.source === activeSeedId || edge.target === activeSeedId;
                const isDownstreamEdge = exposure.paths.some(
                  (p) => p.sourceId === edge.source && p.targetId === edge.target
                );

                const isShocked = isSimulatingFailure && (edge.source === activeSeedId || isDownstreamEdge);

                let strokeColor = '#334155';
                let strokeWidth = 1.5;
                let strokeDash = undefined;
                let marker = 'url(#arrow-supplies)';

                if (edge.type === 'Supplies') {
                  strokeColor = isShocked ? '#f43f5e' : isConnectedToSeed ? '#3b82f6' : '#1e3a8a';
                  strokeWidth = (edge.intensity || 0.5) * 4;
                  marker = isShocked ? 'url(#arrow-shock)' : 'url(#arrow-supplies)';
                } else if (edge.type === 'DrawsFootfall') {
                  strokeColor = '#ec4899';
                  strokeDash = '4,4';
                  marker = 'url(#arrow-footfall)';
                } else if (edge.type === 'BorrowedFrom') {
                  strokeColor = '#f59e0b';
                  strokeWidth = 2;
                }

                // Midpoint for edge text label
                const midX = (sPos.x + tPos.x) / 2;
                const midY = (sPos.y + tPos.y) / 2;

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    <line
                      x1={sPos.x}
                      y1={sPos.y}
                      x2={tPos.x}
                      y2={tPos.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      markerEnd={marker}
                      className={isShocked ? 'animate-pulse' : ''}
                    />
                    {edge.type === 'Supplies' && (
                      <text
                        x={midX}
                        y={midY - 6}
                        fill={isShocked ? '#fda4af' : '#94a3b8'}
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="bg-slate-900"
                      >
                        int {edge.intensity}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Render Employer Blocks */}
              {corridor.employerBlocks.map((emp) => {
                const pos = nodePositions[emp.id];
                if (!pos) return null;
                return (
                  <g key={emp.id} transform={`translate(${pos.x}, ${pos.y})`}>
                    <rect
                      x="-70"
                      y="-25"
                      width="140"
                      height="50"
                      rx="12"
                      fill="#831843"
                      stroke="#f472b6"
                      strokeWidth="1.5"
                      className="cursor-pointer hover:brightness-125 transition"
                    />
                    <text
                      x="0"
                      y="-5"
                      fill="#fdf2f8"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      🏢 {emp.label.split(' ')[0]} {emp.label.split(' ')[1]}
                    </text>
                    <text
                      x="0"
                      y="14"
                      fill="#fbcfe8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {emp.workerCount.toLocaleString()} workers
                    </text>
                  </g>
                );
              })}

              {/* Render Businesses */}
              {corridor.businesses.map((b) => {
                const pos = nodePositions[b.id];
                if (!pos) return null;

                const isSeed = b.id === activeSeedId;
                const isDownstream = exposure.downstreamList.some((d) => d.business.id === b.id);
                const isShocked = isSimulatingFailure && (isSeed || isDownstream);

                let fillBg = '#0f172a';
                let strokeColor = '#334155';
                let textColor = '#cbd5e1';

                if (isSeed) {
                  fillBg = isShocked ? '#4c0519' : '#1e3a8a';
                  strokeColor = isShocked ? '#f43f5e' : '#60a5fa';
                  textColor = '#ffffff';
                } else if (isDownstream) {
                  fillBg = isShocked ? '#380a18' : '#1e1b4b';
                  strokeColor = isShocked ? '#fb7185' : '#818cf8';
                  textColor = '#e0e7ff';
                } else if (b.role.includes('Keystone') || b.role.includes('Hub')) {
                  strokeColor = '#3b82f6';
                }

                return (
                  <g
                    key={b.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => onSelectBusiness(b.id)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing ring for active seed */}
                    {isSeed && (
                      <circle
                        r="38"
                        fill="none"
                        stroke={isShocked ? '#f43f5e' : '#3b82f6'}
                        strokeWidth="2"
                        opacity="0.4"
                        className="animate-ping"
                      />
                    )}

                    {/* Main Node Card */}
                    <rect
                      x="-80"
                      y="-28"
                      width="160"
                      height="56"
                      rx="14"
                      fill={fillBg}
                      stroke={strokeColor}
                      strokeWidth={isSeed ? 2.5 : isDownstream ? 2 : 1.2}
                      className="group-hover:brightness-125 transition-all shadow-md"
                    />

                    {/* Business Name */}
                    <text
                      x="0"
                      y="-8"
                      fill={textColor}
                      fontSize="10.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {b.dba || b.name}
                    </text>

                    {/* Meta: Jobs & Distress */}
                    <text
                      x="0"
                      y="8"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {b.jobs} jobs · dist {b.distressScore.toFixed(2)}
                    </text>

                    {/* Role Badge Tag */}
                    <text
                      x="0"
                      y="20"
                      fill={isSeed ? '#93c5fd' : isDownstream ? '#c7d2fe' : '#64748b'}
                      fontSize="8"
                      textAnchor="middle"
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {isSeed ? '★ SEED APPLICANT' : isDownstream ? '▼ EXPOSED BUYER' : b.role.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Traversal Bar */}
          <div className="z-10 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs flex flex-wrap items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Traversal Formula:</span>
              <code className="text-blue-300 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                (seed)-[:Supplies]-&gt;&#123;1,{selectedDepth}&#125;(exposed)
              </code>
            </div>
            <div className="text-slate-400 text-[11px]">
              Click any node above to focus and re-evaluate downstream cascade.
            </div>
          </div>
        </div>

        {/* Right 1 Col: Selected Node Inspector & GQL Details */}
        <div className="space-y-4">
          {/* Inspector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-bold">
                  {seedBusiness.role}
                </span>
                <h3 className="font-bold text-base text-slate-100 mt-1">
                  {seedBusiness.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{seedBusiness.address}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {seedBusiness.description}
            </p>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DIRECT PAYROLL</span>
                <span className="text-lg font-bold font-mono text-slate-100">{seedBusiness.jobs} jobs</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DOWNSTREAM AT RISK</span>
                <span className="text-lg font-bold font-mono text-indigo-400">+{exposure.totalDownstreamJobs} jobs</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DISTRESS SCORE</span>
                <span className="text-base font-bold font-mono text-amber-400">{seedBusiness.distressScore.toFixed(2)}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">GRANT REQUESTED</span>
                <span className="text-base font-bold font-mono text-emerald-400">${seedBusiness.grantRequested.toLocaleString()}</span>
              </div>
            </div>

            {/* Downstream Cascade List */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Direct & 2-Hop Dependents ({exposure.reachedCount}):</span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  {exposure.totalDownstreamJobs} Total Dependents
                </span>
              </h4>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {exposure.downstreamList.length > 0 ? (
                  exposure.downstreamList.map((d) => (
                    <div
                      key={d.business.id}
                      className="bg-slate-950/80 border border-slate-800/80 p-2 rounded-lg text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-200">{d.business.dba || d.business.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {d.minDepth}-Hop Reach · {d.business.naicsLabel.split(' ')[0]}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-blue-400 font-semibold">{d.business.jobs} jobs</span>
                        <div className="text-[9px] text-slate-500 font-mono">
                          int {(d.cumulativeIntensity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                    Leaf node: No downstream supply dependents identified.
                  </div>
                )}
              </div>
            </div>

            {/* Action button to generate memo */}
            <button
              onClick={() => onGenerateMemo(seedBusiness.id)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Generate Official Grant Memo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* BigQuery GQL Code Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono">
                <FileCode2 className="w-4 h-4 text-blue-400" />
                BigQuery GQL Traversal
              </span>
              <button
                onClick={copyGql}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQuery ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
              {gqlQuery}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
