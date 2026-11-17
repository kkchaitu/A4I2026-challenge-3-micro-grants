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

export function App() {
  const [activeCorridorId, setActiveCorridorId] = useState('central-market');
  const [budget, setBudget] = useState(50000);
  const [activeTab, setActiveTab] = useState('live-queue');
  const [strategyMode, setStrategyMode] = useState('resilience'); // 'resilience' | 'naive'
  const [selectedBusinessId, setSelectedBusinessId] = useState('cm-01');
  const [agentOnline, setAgentOnline] = useState(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState('');

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
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Top Cards */}
        <MetricCards
          budget={budget}
          allocated={totalAllocated}
          directJobs={directJobs}
          cascadeJobs={cascadeJobs}
          downstreamCount={downstreamBusinesses}
          strategyMode={strategyMode}
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
          />
        )}

        {activeTab === 'network-graph' && (
          <NetworkGraph
            corridor={currentCorridor}
            selectedBusinessId={selectedBusinessId}
            onSelectBusiness={setSelectedBusinessId}
            onGenerateMemo={handleSelectBusinessForMemo}
            onSwitchToMap={() => setActiveTab('map-view')}
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
          />
        )}

        {activeTab === 'ai-copilot' && (
          <AIAgentChat
            corridor={currentCorridor}
            agentOnline={agentOnline}
            onSelectBusinessForMemo={handleSelectBusinessForMemo}
            initialPrompt={copilotInitialPrompt}
            onClearInitialPrompt={() => setCopilotInitialPrompt('')}
          />
        )}

        {activeTab === 'equity-audit' && (
          <EquityDemographics corridor={currentCorridor} />
        )}
      </main>

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
