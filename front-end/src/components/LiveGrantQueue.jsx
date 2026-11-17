import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  PlusCircle, 
  ExternalLink, 
  FileText, 
  Network, 
  MapPin, 
  ShieldAlert, 
  ShieldCheck, 
  Building2, 
  DollarSign, 
  Users, 
  Percent, 
  X,
  ChevronRight
} from 'lucide-react';
import { 
  fetchLiveRequests, 
  triggerEvaluateRequest 
} from '../services/agentApi';
import { AIAgentProgressModal } from './AIAgentProgressModal';
import { CommitteePitchReport } from './CommitteePitchReport';

export function LiveGrantQueue({
  onSelectBusinessForGraph,
  onSelectBusinessForMap,
  onSelectBusinessForMemo,
  corridor
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [filterRating, setFilterRating] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pitchReportTarget, setPitchReportTarget] = useState(null);
  const [pitchProgressTarget, setPitchProgressTarget] = useState(null);

  // New application form state
  const [newApp, setNewApp] = useState({
    business_id: '114',
    grant_amount: 50000,
    purpose: 'Stage acoustics modernization and local supplier contract expansion',
    business_name: 'The Warfield Theater'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchLiveRequests();
      if (data && Array.isArray(data)) {
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load live requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleOpenReport = async (requestId) => {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}`);
      if (res.ok) {
        const full = await res.json();
        setActiveReport(full);
      }
    } catch (err) {
      console.error('Failed to load full report:', err);
    }
  };

  const handleReevaluate = async (requestId) => {
    setIsEvaluating(true);
    try {
      const updated = await triggerEvaluateRequest(requestId);
      if (updated) {
        setActiveReport(updated);
        await loadRequests();
      }
    } catch (err) {
      console.error('Error re-evaluating request:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleStartPitchReport = async (req) => {
    let target = req;
    if (!req.report) {
      try {
        const res = await fetch(`/api/requests/${req.request_id}`);
        if (res.ok) {
          target = await res.json();
        }
      } catch (err) {
        console.error('Failed to fetch full request:', err);
      }
    }
    setPitchProgressTarget(target);
  };

  const handleFinishPitchProgress = () => {
    setPitchReportTarget(pitchProgressTarget);
    setPitchProgressTarget(null);
  };

  const handleSubmitNewApp = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApp),
      });
      if (res.ok) {
        const created = await res.json();
        setShowNewModal(false);
        await loadRequests();
        handleOpenReport(created.request_id);
      }
    } catch (err) {
      console.error('Error submitting application:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchRating = (filterRating === 'ALL') ||
      (filterRating === 'STRONGLY RECOMMEND' && r.rating === 'STRONGLY RECOMMEND') ||
      (filterRating === 'RECOMMEND' && r.rating === 'RECOMMEND') ||
      (filterRating === 'REVIEW' && (r.rating.includes('REVIEW') || r.rating.includes('CONDITIONS') || r.rating.includes('RISK')));

    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q ||
      r.business_name.toLowerCase().includes(q) ||
      r.request_id.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q);

    return matchRating && matchQuery;
  });

  const totalCapital = requests.reduce((sum, r) => sum + (r.grant_amount || 0), 0);
  const avgMultiplier = requests.length 
    ? (requests.reduce((s, r) => s + (r.job_multiplier || 1), 0) / requests.length).toFixed(1)
    : '0';
  const avgCostPerJob = requests.length
    ? Math.round(requests.reduce((s, r) => s + (r.cost_per_job || 0), 0) / requests.length)
    : 0;

  const getBadgeStyle = (rating) => {
    if (!rating) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (rating.includes('STRONGLY')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (rating === 'RECOMMEND') return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    if (rating.includes('CONDITIONS')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  };

  if (pitchReportTarget) {
    return (
      <CommitteePitchReport
        applicant={pitchReportTarget}
        onBack={() => setPitchReportTarget(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Engine of Prosperity</span>
                <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  Live ADK Agent & BigQuery GQL
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Live evaluation queue for economic engines. Applicants are scored on 4 core pillars: 
              <strong> 1) Employment Multiplier (Reverse GQL)</strong>, <strong>2) Tract Poverty Equity</strong>, 
              <strong> 3) Resilience Breadth</strong>, and <strong>4) SBA Default Risk</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadRequests}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Grant Application</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Applicants</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{requests.length} Businesses</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Requested</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">${totalCapital.toLocaleString()}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Avg Job Multiplier</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{avgMultiplier}x ROI</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Avg Cost per Job</div>
            <div className="text-lg font-bold text-blue-400 mt-0.5">${avgCostPerJob.toLocaleString()} / job</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/60 mt-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">Filter:</span>
            {[
              { id: 'ALL', label: `All (${requests.length})` },
              { id: 'STRONGLY RECOMMEND', label: 'Strongly Recommend' },
              { id: 'RECOMMEND', label: 'Recommend' },
              { id: 'REVIEW', label: 'Under Review' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterRating(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  filterRating === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search applicant or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                <th className="py-3 px-4">Applicant & ID</th>
                <th className="py-3 px-4">Grant Request</th>
                <th className="py-3 px-4 text-center">Direct / Indirect Jobs</th>
                <th className="py-3 px-4 text-center">Multiplier & Breadth</th>
                <th className="py-3 px-4 text-right">Cost / Job</th>
                <th className="py-3 px-4 text-center">Poverty Need</th>
                <th className="py-3 px-4 text-center">Recommendation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRequests.map((req) => (
                <tr 
                  key={req.request_id}
                  onClick={() => handleOpenReport(req.request_id)}
                  className="hover:bg-slate-800/50 transition cursor-pointer"
                >
                  {/* Applicant & ID */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>{req.business_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span className="bg-slate-800 px-1 rounded text-slate-300">{req.request_id}</span>
                      <span>ID: {req.business_id}</span>
                    </div>
                  </td>

                  {/* Grant Request & Purpose */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-mono font-bold text-slate-100">
                      ${req.grant_amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5" title={req.purpose}>
                      {req.purpose}
                    </div>
                  </td>

                  {/* Direct / Indirect Jobs */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="font-bold text-emerald-400 font-mono">
                      {req.total_job_footprint} total jobs
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {req.direct_jobs} direct • <span className="text-slate-300">{req.indirect_jobs} indirect</span>
                    </div>
                  </td>

                  {/* Multiplier & Breadth */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold font-mono text-xs">
                      ⚡ {req.job_multiplier}x
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {req.supply_chain_breadth} suppliers reached
                    </div>
                  </td>

                  {/* Cost / Job */}
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-200">
                    ${req.cost_per_job.toLocaleString()} / job
                  </td>

                  {/* Poverty Need */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-slate-300 font-medium">{req.neighborhood_poverty_rate}</span>
                  </td>

                  {/* Recommendation Badge & Score */}
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${getBadgeStyle(req.rating)}`}>
                      {req.rating}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Score: <strong className="text-slate-200">{req.overall_score}</strong>/100
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleStartPitchReport(req)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold transition cursor-pointer shadow-sm shadow-emerald-500/20"
                        title="Pitch Case to Committee (AI Dossier & Graphs)"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Pitch Case</span>
                      </button>
                      <button
                        onClick={() => handleOpenReport(req.request_id)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition cursor-pointer"
                        title="View 4-pillar scorecard & memo"
                      >
                        Scorecard
                      </button>
                      <button
                        onClick={() => onSelectBusinessForGraph(req.business_id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                        title="Open in Cascade Network Graph"
                      >
                        <Network className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <button
                        onClick={() => onSelectBusinessForMap(req.business_id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                        title="View on Google Map"
                      >
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                      <button
                        onClick={() => onSelectBusinessForMemo(req.business_id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                        title="Generate Municipal Letterhead Memo"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    {loading ? 'Querying BigQuery Property Graph...' : 'No grant applications found matching criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full 4-Pillar Report & Memo Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center p-4 sm:p-6 lg:p-8">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-emerald-400">
                    {activeReport.request_id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBadgeStyle(activeReport.report?.rating)}`}>
                    {activeReport.report?.rating}
                  </span>
                  <span className="text-xs text-slate-400">
                    Score: <strong className="text-white">{activeReport.report?.overall_score}</strong>/100
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mt-2">
                  {activeReport.report?.business_name || activeReport.business_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeReport.report?.address} • NAICS {activeReport.report?.naics} • Proposed Grant: <strong className="text-emerald-400 font-mono">${activeReport.grant_amount?.toLocaleString()}</strong>
                </p>
              </div>

              <button
                onClick={() => setActiveReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* 4 Evaluation Pillars Grid */}
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Core Track Evaluation Pillars
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Pillar 1: ROI */}
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                      <span>1. Employment ROI</span>
                      <span className="text-[10px] text-emerald-400 font-bold">PRIMARY</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Direct Jobs:</span>
                        <span className="text-slate-200 font-mono font-bold">{activeReport.report?.roi?.direct_jobs}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Indirect Jobs:</span>
                        <span className="text-emerald-400 font-mono font-bold">{activeReport.report?.roi?.indirect_jobs}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                        <span className="text-slate-300">Total Footprint:</span>
                        <span className="text-slate-100 font-mono font-bold">{activeReport.report?.roi?.total_job_footprint}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Multiplier:</span>
                        <span className="text-emerald-400 font-mono font-bold">{activeReport.report?.roi?.job_multiplier}x</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Cost / Job:</span>
                        <span className="text-blue-400 font-mono font-bold">${activeReport.report?.roi?.cost_per_job?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Equity */}
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                      <span>2. Equity & Need</span>
                      <span className="text-[10px] text-purple-400 font-bold">TARGETING</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Tract Poverty:</span>
                        <span className="text-slate-200 font-mono font-bold">{activeReport.report?.equity?.neighborhood_poverty_rate}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Supply Chain Poverty:</span>
                        <span className="text-purple-400 font-mono font-bold">{activeReport.report?.equity?.supply_chain_poverty_footprint}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pt-2 leading-tight">
                        Directs dollars from commercial anchors into supplier census tracts with high poverty.
                      </p>
                    </div>
                  </div>

                  {/* Pillar 3: Resilience */}
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                      <span>3. Resilience</span>
                      <span className="text-[10px] text-blue-400 font-bold">DIVERSITY</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Corridor Conc.:</span>
                        <span className="text-slate-200 font-mono font-bold">{activeReport.report?.resilience?.industry_concentration_risk}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Distinct Suppliers:</span>
                        <span className="text-blue-400 font-mono font-bold">{activeReport.report?.resilience?.supply_chain_breadth}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Industry Variety:</span>
                        <span className="text-slate-200 font-mono font-bold">{activeReport.report?.resilience?.supplier_industry_variety}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4: Risk */}
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                      <span>4. Risk & Context</span>
                      <span className="text-[10px] text-rose-400 font-bold">DEFAULT SCAN</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Cascade Depth:</span>
                        <span className="text-slate-200 font-mono font-bold">{activeReport.report?.risk?.cascade_depth_hops} Hops</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>SBA Fragility:</span>
                        <span className={`font-mono font-bold ${activeReport.report?.risk?.fragility_flag ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {activeReport.report?.risk?.fragility_flag ? 'ACTIVE' : 'CLEAR'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Charged-off:</span>
                        <span className="text-slate-200 font-mono font-bold">{activeReport.report?.risk?.fragile_suppliers_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upstream Supplier Graph Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Upstream Supplier Cascade ({activeReport.report?.suppliers?.length || 0} Nodes)
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    MATCH (engine)&lt;-[:Supplies]-&#123;1,3&#125;(supplier)
                  </span>
                </div>
                
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Supplier Name</th>
                        <th className="py-2.5 px-3 font-mono">ID</th>
                        <th className="py-2.5 px-3 font-mono">NAICS</th>
                        <th className="py-2.5 px-3 text-right">Est. Jobs Sustained</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {(activeReport.report?.suppliers || []).map((sup) => (
                        <tr key={sup.business_id} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 text-slate-200 font-sans">{sup.name}</td>
                          <td className="py-2 px-3 text-slate-400">{sup.business_id}</td>
                          <td className="py-2 px-3 text-slate-400">{sup.naics}</td>
                          <td className="py-2 px-3 text-right text-emerald-400 font-bold">{sup.estimated_jobs} jobs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Executive Grant Memo */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-slate-100">
                      Grant Officer Executive Memorandum (ADK Agent Generated)
                    </h4>
                  </div>
                  <button
                    onClick={() => handleReevaluate(activeReport.request_id)}
                    disabled={isEvaluating}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                    <span>Re-evaluate with Agent</span>
                  </button>
                </div>

                <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {activeReport.memo}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const id = activeReport.business_id;
                    setActiveReport(null);
                    onSelectBusinessForGraph(id);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Open in Interactive Graph</span>
                </button>
                <button
                  onClick={() => {
                    const id = activeReport.business_id;
                    setActiveReport(null);
                    onSelectBusinessForMap(id);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View on Corridor Map</span>
                </button>
                <button
                  onClick={() => {
                    const id = activeReport.business_id;
                    setActiveReport(null);
                    onSelectBusinessForMemo(id);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Municipal Memo</span>
                </button>
                <button
                  onClick={() => {
                    const target = activeReport;
                    setActiveReport(null);
                    handleStartPitchReport(target);
                  }}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Pitch Case to Committee</span>
                </button>
              </div>

              <button
                onClick={() => setActiveReport(null)}
                className="px-4 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

      {/* New Application Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden my-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base">Submit New Grant Application</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewApp} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Corridor Business (or enter ID)</label>
                <select 
                  value={newApp.business_id} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const opt = e.target.selectedOptions[0]?.text || '';
                    setNewApp({
                      ...newApp,
                      business_id: val,
                      business_name: opt.split(' - ')[1] || `Business ${val}`
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="114">114 - The Warfield Theater</option>
                  <option value="141">141 - Binis Kitchen LLC</option>
                  <option value="103">103 - City Produce</option>
                  <option value="169">169 - Golden Auto Muffler & Brake Sf Co.</option>
                  <option value="170">170 - Mo'z Cafe Inc</option>
                  <option value="60">60 - Bluebird Office Supplies</option>
                  <option value="64">64 - 415 Ebikes</option>
                  <option value="54">54 - Qua Spa</option>
                  <option value="150">150 - Point One Navigation Offices</option>
                  <option value="171">171 - Tradespace</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Grant Amount Requested ($ USD)</label>
                <input 
                  type="number" 
                  step="5000" 
                  min="5000" 
                  max="250000" 
                  value={newApp.grant_amount}
                  onChange={(e) => setNewApp({ ...newApp, grant_amount: Number(e.target.value) })}
                  required 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Stated Purpose / Expansion Plan</label>
                <textarea 
                  rows={3} 
                  value={newApp.purpose}
                  onChange={(e) => setNewApp({ ...newApp, purpose: e.target.value })}
                  required 
                  placeholder="Describe operational expansion or local supplier procurement..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? 'Evaluating Graph...' : 'Evaluate Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claude/Gemini-like Reasoning Animation Modal */}
      {pitchProgressTarget && (
        <AIAgentProgressModal
          applicant={pitchProgressTarget}
          onComplete={handleFinishPitchProgress}
          onCancel={() => setPitchProgressTarget(null)}
        />
      )}
    </div>
  );
}
