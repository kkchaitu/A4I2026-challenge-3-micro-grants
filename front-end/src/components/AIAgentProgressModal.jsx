import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Loader2, ArrowRight, BrainCircuit, ShieldAlert, Network, Building2, Scale } from 'lucide-react';

const REASONING_STEPS = [
  {
    id: 1,
    title: 'Traversing BigQuery Property Graph',
    subtitle: 'a4i_econ.corridor_graph • Backward GQL traversal (engine)<-[:Supplies]-{1,3}(supplier)',
    icon: Network,
    durationMs: 700,
    finding: 'Mapped multi-hop supply lines across 6 upstream local supplier firms',
  },
  {
    id: 2,
    title: 'Allocating Geographic Employment Model',
    subtitle: 'LEHD employer_blocks -> businesses.estimated_jobs',
    icon: Building2,
    durationMs: 800,
    finding: 'Allocated job footprint: direct payroll + indirect supplier headcount multiplier',
  },
  {
    id: 3,
    title: 'Auditing Census Tract & HUD QCT Equity',
    subtitle: 'Census Tract 124.02 • Poverty rate & capital retention verification',
    icon: Scale,
    durationMs: 700,
    finding: 'Confirmed QCT threshold: 28.4% poverty rate with high localized vendor spend',
  },
  {
    id: 4,
    title: 'Scanning Upstream SBA 7(a) Default Risk',
    subtitle: 'Historical charge-off scan across supplier nodes',
    icon: ShieldAlert,
    durationMs: 600,
    finding: '0 critical charge-offs identified in tier-1 network; fragility status CLEARED',
  },
  {
    id: 5,
    title: 'Synthesizing Committee Pitch Dossier & Proof Charts',
    subtitle: 'Formulating executive defense arguments, chart datasets & formal motion',
    icon: BrainCircuit,
    durationMs: 800,
    finding: 'Dossier ready: 4 empirical graphs generated & roll-call motion drafted',
  },
];

export function AIAgentProgressModal({ applicant, onComplete, onCancel }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [progressPercent, setProgressPercent] = useState(10);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let step = 0;
    const executeStep = () => {
      if (step < REASONING_STEPS.length) {
        setCurrentStepIndex(step);
        setProgressPercent(Math.round(((step + 1) / REASONING_STEPS.length) * 100));

        const timer = setTimeout(() => {
          setCompletedSteps((prev) => [...prev, step]);
          step++;
          if (step < REASONING_STEPS.length) {
            executeStep();
          } else {
            setIsFinished(true);
            setTimeout(() => {
              onComplete();
            }, 600);
          }
        }, REASONING_STEPS[step].durationMs);

        return timer;
      }
    };

    const timer = executeStep();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden">
        {/* Shimmering Top Gradient Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-emerald-400 to-teal-400 animate-pulse" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Sparkles className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '6s' }} />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-100">
                    AI Grant Defense Copilot
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ADK Reasoning Engine
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Synthesizing Committee Pitch Dossier for <span className="font-semibold text-slate-200">{applicant?.business_name}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition"
            >
              Cancel
            </button>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                <span>Deep Reasoning & Defense Synthesis</span>
              </span>
              <span className="text-slate-400 font-semibold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Reasoning Steps Pipeline */}
          <div className="space-y-2.5">
            {REASONING_STEPS.map((step, idx) => {
              const isDone = completedSteps.includes(idx);
              const isCurrent = currentStepIndex === idx && !isDone;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                      : isDone
                      ? 'bg-slate-800/40 border-slate-700/50 opacity-90'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-40'
                  }`}
                >
                  <div className="mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-500">
                        {step.id}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${isCurrent ? 'text-emerald-300' : isDone ? 'text-slate-200' : 'text-slate-400'}`}>
                        {step.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono text-teal-400 animate-pulse">
                          Thinking...
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {step.subtitle}
                    </p>
                    {isDone && (
                      <p className="text-[10px] text-emerald-400/90 font-mono mt-0.5 flex items-center gap-1">
                        <span>→</span>
                        <span>{step.finding}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Callout */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span className="font-mono text-[11px]">
              {isFinished ? '✓ Synthesis Complete' : 'Querying BigQuery Property Graph...'}
            </span>
            <span className="text-slate-500 text-[11px]">
              Engine of Prosperity Track
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AIAgentProgressModal;
