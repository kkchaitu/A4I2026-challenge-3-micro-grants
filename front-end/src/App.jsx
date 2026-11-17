import React, { useState, useMemo, useEffect } from 'react';
import { CORRIDORS } from './data/corridors';
import {
  calculateDownstreamExposure,
  runNaiveStrategy,
  runResilienceStrategy
} from './utils/graphCalculations';
import { checkAgentHealth } from './services/agentApi';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { FundingQueue } from './components/FundingQueue';
import { NetworkGraph } from './components/NetworkGraph';
import { GoogleMapView } from './components/GoogleMapView';
import { GrantMemoView } from './components/GrantMemoView';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { AIAgentChat } from './components/AIAgentChat';
import { EquityDemographics } from './components/EquityDemographics';
import { LiveGrantQueue } from './components/LiveGrantQueue';
import { JudgesScorecard } from './components/JudgesScorecard';
import { Bot } from 'lucide-react';

export function App() {
  const [activeCorridorId, setActiveCorridorId] = useState('central-market');
  const [budget, setBudget] = useState(50000);
  const [activeTab, setActiveTab] = useState('live-queue');
  const [strategyMode, setStrategyMode] = useState('resilience'); // 'resilience' | 'naive'
  const [selectedBusinessId, setSelectedBusinessId] = useState('cm-01');
  const [agentOnline, setAgentOnline] = useState(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState('');

  // Conversational Copilot drawer & query state
  const [copilotDrawerOpen, setCopilotDrawerOpen] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState('');

  const handleAskCopilot = (queryText) => {
    setCopilotQuery(queryText);
    setCopilotDrawerOpen(true);
  };

  // Theme management (default light theme)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const checkStatus = async () => {
    const res = await checkAgentHealth();
    setAgentOnline(Boolean(res.online));
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const currentCorridor = CORRIDORS[activeCorridorId] || CORRIDORS['central-market'];

  // Calculate funded IDs based on active strategy
  const resilienceResults = useMemo(
    () => runResilienceStrategy(currentCorridor, budget),
    [currentCorridor, budget]
  );

  const naiveResults = useMemo(
    () => runNaiveStrategy(currentCorridor, budget),
    [currentCorridor, budget]
  );

  // Custom manual selections or strategy defaults
  const [customFundedIds, setCustomFundedIds] = useState(() =>
    resilienceResults.funded.map(b => b.id)
  );

  const activeFundedIds = useMemo(() => {
    if (strategyMode === 'resilience') {
      return resilienceResults.funded.map(b => b.id);
    }
    if (strategyMode === 'naive') {
      return naiveResults.funded.map(b => b.id);
    }
    return customFundedIds;
  }, [strategyMode, resilienceResults, naiveResults, customFundedIds]);

  // Aggregate metrics
  const { totalAllocated, directJobs, cascadeJobs, downstreamBusinesses } = useMemo(() => {
    const fundedBusinesses = currentCorridor.businesses.filter(b => activeFundedIds.includes(b.id));
    const allocated = fundedBusinesses.reduce((acc, b) => acc + b.grantRequested, 0);
    const direct = fundedBusinesses.reduce((acc, b) => acc + b.jobs, 0);

    let cascade = 0;
    const reachedSet = new Set();

    fundedBusinesses.forEach(b => {
      const exp = calculateDownstreamExposure(b.id, currentCorridor, 2);
      exp.downstreamList.forEach(d => reachedSet.add(d.business.id));
      cascade += exp.totalDownstreamJobs;
    });

    return {
      totalAllocated: allocated,
      directJobs: direct,
      cascadeJobs: cascade,
      downstreamBusinesses: reachedSet.size,
    };
  }, [currentCorridor, activeFundedIds]);

  // Handle corridor switch
  const handleSelectCorridor = (newCorridorId) => {
    setActiveCorridorId(newCorridorId);
    const newCorridor = CORRIDORS[newCorridorId];
    setBudget(newCorridor.defaultBudget);
    setSelectedBusinessId(newCorridor.businesses[0].id);
    const newResilience = runResilienceStrategy(newCorridor, newCorridor.defaultBudget);
    setCustomFundedIds(newResilience.funded.map(b => b.id));
    setStrategyMode('resilience');
  };

  // Toggle funding for a single business
  const handleToggleFund = (bizId) => {
    setStrategyMode('custom');
    if (activeFundedIds.includes(bizId)) {
      setCustomFundedIds(activeFundedIds.filter(id => id !== bizId));
    } else {
      setCustomFundedIds([...activeFundedIds, bizId]);
    }
  };

  const handleApplyResilienceStrategy = () => {
    setStrategyMode('resilience');
    setCustomFundedIds(resilienceResults.funded.map(b => b.id));
  };

  const handleApplyNaiveStrategy = () => {
    setStrategyMode('naive');
    setCustomFundedIds(naiveResults.funded.map(b => b.id));
  };

  const handleSelectBusinessForGraph = (bizId) => {
    setSelectedBusinessId(bizId);
    setActiveTab('network-graph');
  };

  const handleSelectBusinessForMemo = (bizId) => {
    setSelectedBusinessId(bizId);
    setActiveTab('grant-memo');
  };

  const handlePitchWithCopilot = (req) => {
    const bizName = req.report?.business_name || req.business_name || `Applicant Business #${req.business_id}`;
    const amount = req.grant_amount || 50000;
    const purpose = req.purpose || req.report?.purpose || 'Stage acoustics modernization and local supplier contract expansion';
    const prompt = `Prepare the official municipal committee pitch deck and economic defense for applicant ${bizName} (ID: ${req.business_id}, Requested Grant: $${amount.toLocaleString()}, Purpose: "${purpose}"). Execute the multi-stage evaluation protocol across supply chain cascade GQL traversal, Census LEHD job multiplier modeling, tract poverty equity audit, upstream SBA loan charge-off scan, counterfactual runner-up comparison, and compile the formal 5-slide pitch deck and roll-call motion.`;
    setCopilotInitialPrompt(prompt);
    setActiveTab('ai-copilot');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        corridors={CORRIDORS}
        activeCorridorId={activeCorridorId}
        onSelectCorridor={handleSelectCorridor}
        budget={budget}
        onChangeBudget={setBudget}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        strategyMode={strategyMode}
        onSetStrategyMode={(mode) => {
          setStrategyMode(mode);
          if (mode === 'resilience') handleApplyResilienceStrategy();
          if (mode === 'naive') handleApplyNaiveStrategy();
        }}
        agentOnline={agentOnline}
        onRefreshAgent={checkStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Top Cards with Conversational Triggers */}
        <MetricCards
          budget={budget}
          allocated={totalAllocated}
          directJobs={directJobs}
          cascadeJobs={cascadeJobs}
          downstreamCount={downstreamBusinesses}
          strategyMode={strategyMode}
          onAskCopilot={handleAskCopilot}
        />

        {/* Dynamic Tab Views */}
        {activeTab === 'live-queue' && (
          <LiveGrantQueue
            corridor={currentCorridor}
            onSelectBusinessForGraph={handleSelectBusinessForGraph}
            onSelectBusinessForMap={(bizId) => {
              setSelectedBusinessId(bizId);
              setActiveTab('map-view');
            }}
            onSelectBusinessForMemo={handleSelectBusinessForMemo}
            onPitchWithCopilot={handlePitchWithCopilot}
          />
        )}

        {activeTab === 'judges-scoring' && (
          <JudgesScorecard
            onNavigateTab={(tabId) => setActiveTab(tabId)}
            onAskCopilot={handleAskCopilot}
          />
        )}

        {activeTab === 'funding-queue' && (
          <FundingQueue
            corridor={currentCorridor}
            fundedIds={activeFundedIds}
            onToggleFund={handleToggleFund}
            onApplyResilienceStrategy={handleApplyResilienceStrategy}
            onApplyNaiveStrategy={handleApplyNaiveStrategy}
            onSelectBusinessForGraph={handleSelectBusinessForGraph}
            onSelectBusinessForMemo={handleSelectBusinessForMemo}
            strategyMode={strategyMode}
            onAskCopilot={handleAskCopilot}
          />
        )}

        {activeTab === 'network-graph' && (
          <NetworkGraph
            corridor={currentCorridor}
            selectedBusinessId={selectedBusinessId}
            onSelectBusiness={setSelectedBusinessId}
            onGenerateMemo={handleSelectBusinessForMemo}
            onSwitchToMap={() => setActiveTab('map-view')}
            onAskCopilot={handleAskCopilot}
            theme={theme}
          />
        )}

        {activeTab === 'map-view' && (
          <GoogleMapView
            corridor={currentCorridor}
            selectedBusinessId={selectedBusinessId}
            onSelectBusiness={setSelectedBusinessId}
            onGenerateMemo={handleSelectBusinessForMemo}
          />
        )}

        {activeTab === 'grant-memo' && (
          <GrantMemoView
            corridor={currentCorridor}
            selectedBusinessId={selectedBusinessId}
            onSelectBusiness={setSelectedBusinessId}
          />
        )}

        {activeTab === 'what-if' && (
          <WhatIfSimulator
            corridor={currentCorridor}
            budget={budget}
            onAskCopilot={handleAskCopilot}
          />
        )}

        {activeTab === 'ai-copilot' && (
          <AIAgentChat
            corridor={currentCorridor}
            agentOnline={agentOnline}
            onSelectBusinessForMemo={handleSelectBusinessForMemo}
            initialPrompt={copilotInitialPrompt}
            onClearInitialPrompt={() => setCopilotInitialPrompt('')}
            initialQuery={copilotQuery}
          />
        )}

        {activeTab === 'equity-audit' && (
          <EquityDemographics
            corridor={currentCorridor}
            onAskCopilot={handleAskCopilot}
          />
        )}
      </main>

      {/* Floating Copilot Launcher Button */}
      {!copilotDrawerOpen && activeTab !== 'ai-copilot' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              setCopilotQuery('');
              setCopilotDrawerOpen(true);
            }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs shadow-2xl shadow-indigo-500/40 border border-blue-400/30 transition-all hover:scale-105 cursor-pointer group"
            title="Open Conversational AI Copilot (Voice & Chat)"
          >
            <div className="relative flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${agentOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <span>Ask AI Copilot</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
              🎙️ Voice
            </span>
          </button>
        </div>
      )}

      {/* Floating Conversational AI Drawer */}
      {copilotDrawerOpen && activeTab !== 'ai-copilot' && (
        <div className="fixed bottom-5 right-5 z-50 w-[95vw] sm:w-[480px] max-w-[480px] shadow-2xl shadow-black/80 rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden">
          <AIAgentChat
            corridor={currentCorridor}
            agentOnline={agentOnline}
            onSelectBusinessForMemo={handleSelectBusinessForMemo}
            initialQuery={copilotQuery}
            isDrawer={true}
            onCloseDrawer={() => setCopilotDrawerOpen(false)}
            onExpandToFullTab={() => {
              setCopilotDrawerOpen(false);
              setActiveTab('ai-copilot');
            }}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 px-6 text-xs text-slate-500 font-mono flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div>
          Agents for Impact 2026 • Challenge 3: Economic Resilience & Micro-Grants
        </div>
        <div className="flex items-center gap-4">
          <span>BigQuery GQL Native Property Graph</span>
          <span>•</span>
          <span>Open Knowledge & Socrata Open Data</span>
        </div>
      </footer>
    </div>
  );
}
export default App;
