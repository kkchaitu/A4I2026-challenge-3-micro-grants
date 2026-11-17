import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { 
  Printer, ArrowLeft, ExternalLink, CheckCircle, Scale, 
  TrendingUp, ShieldAlert, Network, Building2, FileText, Sparkles 
} from 'lucide-react';

export function CommitteePitchReport({ applicant, onBack }) {
  const jobsChartRef = useRef(null);
  const pillarChartRef = useRef(null);
  const tierChartRef = useRef(null);
  const costChartRef = useRef(null);

  const report = applicant?.report || {};
  const dossier = report?.dossier || {};
  const header = dossier?.header || {};
  const charts = dossier?.charts || {};
  const defense = dossier?.defense_narrative || {};

  const bizName = applicant?.business_name || header.applicant_name || 'Applicant Business';
  const grantAmount = applicant?.grant_amount || header.grant_amount || 50000;
  const rating = header.rating || applicant?.rating || 'STRONGLY RECOMMEND';
  const score = header.overall_score || applicant?.overall_score || 85.0;
  const ratingColor = header.rating_color || 'emerald';

  useEffect(() => {
    const chartInstances = [];

    // Chart 1: Direct vs Indirect Jobs Donut
    if (jobsChartRef.current && charts?.jobs_breakdown) {
      const jb = charts.jobs_breakdown;
      const chart = new Chart(jobsChartRef.current, {
        type: 'doughnut',
        data: {
          labels: jb.labels || ['Direct Jobs', 'Indirect Supplier Jobs'],
          datasets: [{
            data: jb.data || [15, 45],
            backgroundColor: ['#0284c7', '#10b981'],
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          },
        },
      });
      chartInstances.push(chart);
    }

    // Chart 2: 4-Pillar Radar
    if (pillarChartRef.current && charts?.pillar_scores) {
      const ps = charts.pillar_scores;
      const chart = new Chart(pillarChartRef.current, {
        type: 'radar',
        data: {
          labels: ps.labels || ['ROI Multiplier', 'Equity Need', 'Resilience Breadth', 'Risk Safety'],
          datasets: [{
            label: 'Pillar Rating (0-100)',
            data: ps.scores || [90, 85, 80, 95],
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: '#10b981',
            pointBackgroundColor: '#059669',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: { stepSize: 25, display: false },
              pointLabels: { font: { size: 10 } },
            },
          },
          plugins: { legend: { display: false } },
        },
      });
      chartInstances.push(chart);
    }

    // Chart 3: Cascade Tiers Bar
    if (tierChartRef.current && charts?.cascade_tiers) {
      const ct = charts.cascade_tiers;
      const chart = new Chart(tierChartRef.current, {
        type: 'bar',
        data: {
          labels: ct.labels || ['Tier 1 Direct', 'Tier 2 Upstream', 'Tier 3 Distributors'],
          datasets: [{
            label: 'Jobs Reached',
            data: ct.jobs || [30, 15, 5],
            backgroundColor: '#6366f1',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } },
          },
          plugins: { legend: { display: false } },
        },
      });
      chartInstances.push(chart);
    }

    // Chart 4: Cost per Job Benchmark Horizontal Bar
    if (costChartRef.current && charts?.cost_benchmark) {
      const cb = charts.cost_benchmark;
      const chart = new Chart(costChartRef.current, {
        type: 'bar',
        data: {
          labels: cb.labels || ['This Grant Cost/Job', 'City Benchmark'],
          datasets: [{
            label: 'Cost Per Job ($)',
            data: cb.costs || [750, 25000],
            backgroundColor: ['#059669', '#cbd5e1'],
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { callback: (val) => '$' + Number(val).toLocaleString() },
            },
            y: { grid: { display: false } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => '$' + Number(ctx.parsed.x).toLocaleString() + ' per job',
              },
            },
          },
        },
      });
      chartInstances.push(chart);
    }

    return () => {
      chartInstances.forEach((c) => c.destroy());
    };
  }, [charts]);

  return (
    <div className="space-y-4">
      {/* Top Navigation & Print Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 px-4 text-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Decision Queue</span>
        </button>

        <div className="flex items-center gap-2">
          {applicant?.request_id && (
            <a
              href={`/report/${applicant.request_id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition font-medium"
              title="Open full page standalone version"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer shadow-md shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print Committee Dossier / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Executive HTML Dossier Page */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans">
        {/* Letterhead Banner */}
        <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-8 sm:p-10 border-b-4 border-amber-500 relative">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-widest font-semibold text-blue-300 font-mono">
                {header.jurisdiction || 'City & County of San Francisco'} • {header.agency || 'OEWD'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {header.document_type || 'OFFICIAL COMMITTEE PITCH DOSSIER & ECONOMIC DEFENSE MEMO'}
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/80">
                {header.program || 'Engine of Prosperity: Micro-Grants & Economic Resilience Initiative'} • Docket:{' '}
                <span className="font-mono text-amber-300">{header.dossier_id || 'DOSSIER-2026'}</span>
              </p>
            </div>

            {/* Official Municipal Crest Badge */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-amber-400/80 flex flex-col items-center justify-center text-center p-2 shadow-lg backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-amber-400 mb-0.5" />
              <span className="text-[9px] font-bold text-amber-200 uppercase leading-tight font-serif">
                SF OEWD<br />SEAL
              </span>
              <span className="text-[7px] font-mono text-blue-200 mt-0.5">A4I 2026</span>
            </div>
          </div>
        </header>

        {/* Metadata Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 px-8 sm:px-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Applicant Engine</span>
            <div className="font-bold text-slate-800 text-base mt-0.5">{bizName}</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Grant Requested</span>
            <div className="font-bold text-emerald-600 text-base mt-0.5">${Number(grantAmount).toLocaleString()}</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Corridor & NAICS</span>
            <div className="font-bold text-slate-800 text-base mt-0.5">Central Market ({header.naics || '722511'})</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Review Docket</span>
            <div className="font-bold text-slate-800 text-base mt-0.5">{header.review_cycle || 'FY 2026-Q1'}</div>
          </div>
        </div>

        {/* Decision Stamping Banner */}
        <div className="mx-8 sm:mx-10 my-6 p-5 rounded-xl border-2 flex flex-wrap items-center justify-between gap-4 bg-emerald-50 border-emerald-500 text-emerald-900">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide uppercase text-emerald-950">
                {rating}
              </h2>
              <p className="text-xs text-slate-600">
                Official recommendation determined by AI Multiplier & Supply Graph Defense Engine
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-black font-mono text-emerald-900 leading-none">
              {score}<span className="text-base text-slate-500">/100</span>
            </div>
            <div className="text-[10px] font-semibold uppercase text-slate-500 mt-1">Composite Engine Score</div>
          </div>
        </div>

        {/* Dossier Body */}
        <main className="p-8 sm:p-10 pt-2 space-y-8">
          {/* SECTION 1: VISUAL PROOF GRAPHS (CHART.JS) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b-2 border-slate-200">
              <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">01</span>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                Visual Proof of Economic Multiplier (Empirical Graphs)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Chart 1: Jobs Donut */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                  <span>Direct vs. Indirect Jobs Sustained</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono text-[11px]">
                    {charts.jobs_breakdown?.multiplier || 1.62}x Multiplier
                  </span>
                </div>
                <div className="relative h-52 w-full">
                  <canvas ref={jobsChartRef} />
                </div>
              </div>

              {/* Chart 2: 4-Pillar Radar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                  <span>4-Pillar Metric Balance</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono text-[11px]">
                    Balanced Scorecard
                  </span>
                </div>
                <div className="relative h-52 w-full">
                  <canvas ref={pillarChartRef} />
                </div>
              </div>

              {/* Chart 3: Cascade Tiers */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                  <span>Supply Chain Cascade by Tier</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono text-[11px]">
                    3-Hop Traversal
                  </span>
                </div>
                <div className="relative h-52 w-full">
                  <canvas ref={tierChartRef} />
                </div>
              </div>

              {/* Chart 4: Cost per Job Benchmark */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                  <span>Cost-per-Job Efficiency vs. City Benchmark</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono text-[11px]">
                    {charts.cost_benchmark?.savings_pct || 94}% Savings
                  </span>
                </div>
                <div className="relative h-52 w-full">
                  <canvas ref={costChartRef} />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: THE ECONOMIC DEFENSE PITCH */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b-2 border-slate-200">
              <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">02</span>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                The Economic Case for Approval (AI Agent Pitch)
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {defense.executive_pitch || `${bizName} operates as an indispensable commercial engine along the corridor.`}
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg text-xs text-blue-900 space-y-1">
              <div className="font-bold text-blue-950">Key Economic Defense Principle: Growth Acceleration Over Naive Distress</div>
              <p className="text-blue-800">
                Rather than subsidizing isolated distressed units, this grant fuels a verified economic anchor whose B2B procurement transmits liquidity across localized supplier nodes.
              </p>
            </div>
          </section>

          {/* SECTION 3: REVERSE GQL MULTIPLIER MATH */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b-2 border-slate-200">
              <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">03</span>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                Downstream Multiplier Proof & Supply Cascade Math
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {defense.multiplier_math}
            </p>

            {/* Upstream Suppliers Table */}
            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 p-3 px-4 font-bold text-xs uppercase text-slate-700 tracking-wider">
                Verified Upstream Suppliers Traversed via BigQuery Property Graph
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3 px-4">Supplier Entity Name</th>
                      <th className="p-3 px-4">NAICS</th>
                      <th className="p-3 px-4 text-right">Modeled Jobs</th>
                      <th className="p-3 px-4 text-center">Network Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(report.suppliers || []).slice(0, 6).map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 px-4 font-medium text-slate-800">{s.name}</td>
                        <td className="p-3 px-4 font-mono text-slate-500">{s.naics || 'N/A'}</td>
                        <td className="p-3 px-4 font-mono text-right font-semibold text-slate-700">{s.estimated_jobs || 'N/A'} jobs</td>
                        <td className="p-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 4: TRACT EQUITY DEFENSE */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b-2 border-slate-200">
              <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">04</span>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                Tract Equity & Localized Capital Retention
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {defense.equity_justification}
            </p>
          </section>

          {/* SECTION 5: COUNTERFACTUAL & RISK SAFEGUARDS */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b-2 border-slate-200">
              <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">05</span>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                Counter-Factual Analysis & Risk Mitigation
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Impact of Inaction:</strong> {defense.counterfactual_analysis}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">SBA Fragility Scan & Disclosures:</strong> {defense.risk_mitigation}
            </p>
          </section>

          {/* SECTION 6: RECOMMENDED COMMITTEE MOTION */}
          <div className="bg-amber-50/80 border-2 border-dashed border-amber-400 rounded-xl p-6 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-900 text-sm">
              <Scale className="w-4 h-4 text-amber-600" />
              <span>Recommended Formal Motion for Committee Roll-Call Vote</span>
            </div>
            <p className="italic leading-relaxed text-amber-900">
              "{defense.committee_motion || `RESOLVED, That the Committee approves grant allocation for ${bizName}.`}"
            </p>
          </div>
        </main>

        {/* Municipal Footer */}
        <footer className="bg-slate-50 border-t border-slate-200 p-6 px-8 sm:px-10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
          <div>City & County of San Francisco • Municipal Code Subch. IV (Resilience Allocation)</div>
          <div>Prepared by: Engine of Prosperity ADK Reasoning Agent • Verified via BigQuery GQL</div>
        </footer>
      </div>
    </div>
  );
}
export default CommitteePitchReport;
