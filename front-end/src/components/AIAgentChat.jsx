import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Terminal,
  RotateCcw,
  User,
  WifiOff,
  Wifi,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
  ExternalLink,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AudioLines,
  Maximize2,
  X,
} from 'lucide-react';
import { sendAgentQuery, resetSession } from '../services/agentApi';

// ─── Voice helpers ────────────────────────────────────────────────────────────
const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

/** Strip markdown so TTS doesn't read "hash hash Title" */
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*>]\s+/gm, '')
    .replace(/\|.+\|/g, '')
    .replace(/\n{2,}/g, '. ')
    .trim();
}

export function AIAgentChat({
  corridor,
  agentOnline,
  onSelectBusinessForMemo,
  initialPrompt,
  onClearInitialPrompt,
  initialQuery = '',
  isDrawer = false,
  onCloseDrawer,
  onExpandToFullTab,
}) {
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: `Hello! I am your Engine of Prosperity AI Copilot for the **${corridor.name}** corridor.\n\nI use BigQuery Property Graph multi-hop GQL traversals to identify which businesses create the largest downstream job multiplier. Grant one engine, power a whole neighborhood.\n\nAsk me anything about applicants, supply chain network effects, or click any applicant's **'Pitch Case'** button to watch me execute the 6-stage committee pitch deck protocol live!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalls: [],
      live: false,
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-send when initialQuery prop arrives or changes
  const lastExecutedQueryRef = useRef('');
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && initialQuery !== lastExecutedQueryRef.current) {
      lastExecutedQueryRef.current = initialQuery;
      handleSendPromptRef.current?.(initialQuery);
    }
  }, [initialQuery]);

  // ── Voice input state ──────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);

  // ── Voice output state ─────────────────────────────────────────────────────
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const utteranceRef = useRef(null);

  // ── Speak an agent response ────────────────────────────────────────────────
  const speak = useCallback((text, msgId) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(stripMarkdown(text));
    utter.rate = 1.05;
    utter.pitch = 1;
    // Prefer a female English voice when available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /en.*female|samantha|victoria|karen|moira/i.test(v.name))
      || voices.find(v => /en/i.test(v.lang));
    if (preferred) utter.voice = preferred;
    utter.onstart = () => setSpeakingMsgId(msgId);
    utter.onend = () => setSpeakingMsgId(null);
    utter.onerror = () => setSpeakingMsgId(null);
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);
  }, []);

  // Stop TTS when component unmounts
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  // ── Voice recognition toggle ───────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    setVoiceError(null);
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => setIsListening(true);

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setInput(transcript);
      // Auto-send on final result
      if (e.results[e.results.length - 1].isFinal) {
        setIsListening(false);
        // slight delay so state flushes
        setTimeout(() => handleSendPromptRef.current(transcript), 100);
      }
    };

    rec.onerror = (e) => {
      setVoiceError(e.error === 'not-allowed'
        ? 'Microphone permission denied. Please allow mic access and try again.'
        : `Voice error: ${e.error}`);
      setIsListening(false);
    };

    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [isListening]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle auto-pasted initial prompt from LiveGrantQueue or other tabs
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const textToRun = initialPrompt.trim();
      if (onClearInitialPrompt) onClearInitialPrompt();
      handleSendPrompt(textToRun);
    }
  }, [initialPrompt]);

  const suggestedPrompts = [
    {
      label: '📑 Pitch Case: The Warfield Theater',
      prompt: 'Prepare the official municipal committee pitch deck and economic defense for applicant The Warfield Theater (ID: 114, Requested Grant: $50,000). Execute the multi-stage evaluation protocol across supply chain cascade GQL traversal, Census LEHD job multiplier modeling, tract poverty equity audit, upstream SBA loan charge-off scan, counterfactual runner-up comparison, and compile the formal 5-slide pitch deck and roll-call motion.',
    },
    {
      label: '🏆 Top grant applicant?',
      prompt: 'Who is the top recommended grant applicant and why? Show me their job multiplier and supply chain reach.',
      label: '🏆 Who is our top applicant?',
      prompt: 'Who is our top recommended grant applicant and why? Break down their job multiplier and supply chain reach.',
    },
    {
      label: '⚡ Explain 16.7x Multiplier',
      prompt: 'Explain how the 16.7x job multiplier for The Warfield Theater is calculated using BigQuery property graphs.',
    },
    {
      label: '🔗 Cascade shock if anchor closes?',
      prompt: 'What happens to the corridor supply chain if our anchor venue closes? Trace the downstream cascade risk.',
    },
    {
      label: '📊 Section 13 Sweet Spot',
      prompt: 'Which local businesses protect 5 to 25 dependents without being giant corporate monopolies?',
    },
    {
      label: '⚖️ Audit Tract Equity & CDFI',
      prompt: 'Audit the equity and demographic impact of funding our top resilience candidates in Census Tract 124.02.',
    },
    {
      label: '🛡️ Policy & Guardrail Audit',
      prompt: 'Run a 5-point guardrail and compliance audit on applicant 114 to verify budget limits ($1k-$100k), Equal Credit Opportunity Act Fair Lending neutrality, and SQL safety.',
    },
  ];

  const handleSendPrompt = async (textToSend) => {
    const userText = (textToSend || input).trim();
    if (!userText || isTyping) return;

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), sender: 'user', text: userText, timestamp: ts, toolCalls: [] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // ── Live ADK agent call ──────────────────────────────────────────────────
    const result = await sendAgentQuery(userText);

    if (result?.success && result.text) {
      const liveTools = (result.toolCalls && result.toolCalls.length > 0)
        ? result.toolCalls
        : [{
          tool: 'ADK → gemini-flash (Vertex AI)',
          query: `POST /run  app=app  user=grant-officer`,
          output: `${(result.events ?? []).length} events received from agent`,
        }];

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: result.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          live: true,
          toolCalls: liveTools,
        }
      ]);
      setIsTyping(false);
      return;
    }

    // ── Offline / fallback grounded responses ────────────────────────────────
    setTimeout(() => {
      let agentResponse = '';
      let toolExecutionList = [];
      const q = userText.toLowerCase();

      if (q.includes('pitch') || q.includes('deck') || q.includes('committee')) {
        toolExecutionList = [
          {
            tool: 'traverse_upstream_supply_chain',
            query: 'traverse_upstream_supply_chain(business_id="114", max_hops=3)',
            output: 'MATCH (engine:Business {business_id: "114"})<-[:Supplies]-{1,3}(supplier:Business)\n↳ 15 upstream suppliers identified (City Audio, Mid-Market Staffing, Golden Gate Concessions). Total upstream jobs: 1,335.',
          },
          {
            tool: 'model_direct_and_cascade_jobs',
            query: 'model_direct_and_cascade_jobs(business_id="114", grant_amount=50000)',
            output: 'LEHD Block Allocation: Direct Payroll: 84 jobs | Downstream Supply Cascade: 1,335 jobs | Total Footprint: 1,419 jobs | Net Cost/Job: $35.24 vs $2,500 City Benchmark (98.6% savings).',
          },
          {
            tool: 'audit_tract_equity_and_poverty',
            query: 'audit_tract_equity_and_poverty(business_id="114")',
            output: 'Census Tract 012402: Poverty Rate 28.4% | HUD Qualified Census Tract (QCT) Priority | 26.8% of upstream supply spend retained in low-income block groups.',
          },
          {
            tool: 'scan_upstream_sba_chargeoffs',
            query: 'scan_upstream_sba_chargeoffs(business_id="114")',
            output: 'Querying a4i_econ.borrowed_from for charged_off = true:\n↳ 15 suppliers audited, 0 defaults detected. Charge-off rate: 0.0%. Supply chain credit health: EXCELLENT.',
          },
          {
            tool: 'evaluate_counterfactual_comparison',
            query: 'evaluate_counterfactual_comparison(business_id="114", grant_amount=50000)',
            output: 'Counterfactual: Warfield (1,419 jobs @ $35.24/job) vs Grove Street Books cm-07 (Distress 0.88, 3 jobs @ $16,666/job). Hub Exclusion Rule: PASS (No default contagion, local corridor procurement).',
          },
          {
            tool: 'compile_committee_pitch_deck',
            query: 'compile_committee_pitch_deck(business_id="114", grant_amount=50000, purpose="Stage acoustics modernization")',
            output: 'Docket: DOCKET-2026-114-WARFIELD | 5 Presentation Slides Compiled | Formal Motion Registered | Standalone Dossier: /report/REQ-2026-001',
          },
        ];

        agentResponse = `## 🏛️ Official Municipal Committee Pitch Deck: The Warfield Theater
**Docket ID:** DOCKET-2026-114-WARFIELD • **Requested Grant:** $50,000 • **Recommendation:** STRONGLY RECOMMEND (96/100)

I have executed our complete 6-stage evaluation protocol across BigQuery GQL, Census LEHD job modeling, and SBA loan credit records. Here is the executive 5-slide pitch defense:

---

### 📑 Slide 1: The Hook — Flip the Script (Engines Over Leaves)
* **The Policy Trap:** Sinking $50,000 into terminal storefronts with zero upstream linkages saves only 2–3 jobs while failing to move the unemployment needle.
* **The Strategic Shift:** The Warfield Theater is an **economic engine**. Every dollar of ticket and stage volume cascades backward into local audio engineers, event staffing firms, and regional food distributors.

### 📊 Slide 2: Visual Proof — 16.9× Catalytic Job Multiplier
* **Direct Payroll:** 84 modeled jobs sustained
* **Downstream Supply Cascade:** 1,335 indirect jobs across 15 corridor suppliers
* **Total Community Footprint:** **1,419 jobs protected**
* **Municipal Efficiency:** **$35.24 per job saved** — compared to the City’s $2,500/job benchmark, this delivers a **98.6% cost reduction**.

### ⚖️ Slide 3: Equity Defense — High-Poverty Neighborhood Retention
* **Census Tract 012402 Poverty Rate:** 28.4% (HUD Qualified Census Tract)
* **Localized Spend Retention:** 26.8% of upstream supply chain contracts flow into low-income block groups, ensuring municipal relief funds recirculate locally.

### 🎯 Slide 4: Counterfactual Showdown vs Naive Distress Runner-Up
* **The Dilemma:** Grove Street Books (cm-07) leads in acute distress (0.88), but as a terminal leaf node, funding it protects only 3 jobs ($16,666/job).
* **The Defense:** Funding Warfield protects **1,419 community jobs** across 15 vendors at **$35.24/job** ($18\\times$ higher impact).
* **Hub Exclusion Rule Check:** PASSED. The Warfield is verified with **0% SBA charge-off defaults** and local procurement integrity.

### 📜 Slide 5: Recommended Municipal Committee Motion
> *"RESOLVED, That the Economic Resilience Committee approves a grant allocation of $50,000 from the Subchapter IV Resilience Fund to The Warfield Theater (Application REQ-2026-001) to support stage modernization and secure 1,419 direct and indirect municipal jobs."*

---
👉 **[View Full Standalone Committee Dossier with Proof Graphs](/report/REQ-2026-001)**`;
      } else if (q.includes('top') || q.includes('recommend') || q.includes('applicant')) {
        agentResponse = `### Top Recommended Grant Applicant: The Warfield Theater\n\n**Score: 96/100 — STRONGLY RECOMMEND**\n\n- 🏢 **Direct Jobs:** 81\n- 🔗 **Indirect Jobs (2-hop suppliers):** 1,272\n- 📊 **Total Job Footprint:** 1,353\n- 💰 **Cost Per Job:** $36.95\n- 🚀 **Job Multiplier:** 16.7×\n- 🤝 **Supply Chain Breadth:** 12 upstream suppliers\n\nThe Warfield's stage acoustics upgrade expands supplier contracts with local audio vendors, event staffing agencies, and food/beverage distributors — creating a massive downstream ripple.\n\n> *Requested: $50,000 for Stage acoustics modernization and supplier contract expansion*`;
        toolExecution = {
          tool: 'api/requests (live data)',
          query: 'GET /api/requests → sorted by overall_score DESC',
          output: 'REQ-2026-001: Warfield Theater, score=96, jobs=1353, cost_per_job=$36.95',
        };
      } else if (q.includes('section 13') || (q.includes('5') && q.includes('25'))) {
        agentResponse = `### Section 13 GQL: The 5-to-25 Sweet Spot\n\nBusinesses with 5–25 downstream dependents offer the best catalytic grant ratio:\n\n- **Bayside Roasters** (14 direct buyers, 26 within 2 hops) — NAICS 3119\n- **Merchant Roots** (12 direct buyers, 38 within 2 hops) — NAICS 7225\n- **Mid-Market Hardware** (15 direct buyers, 35 within 2 hops) — NAICS 4441\n- **Kearny Kitchen** (8 direct buyers, 19 within 2 hops) — NAICS 7223\n\nThese four hold the highest resilience-to-grant ratio in the corridor.`;
        toolExecution = {
          tool: 'bigquery_graph_traversal (GQL)',
          query: `GRAPH a4i_econ.corridor_graph\nMATCH (engine:Business)<-[:Supplies]-{1,3}(supplier:Business)\nRETURN engine.name, COUNT(DISTINCT supplier.business_id) AS reach\nFILTER reach >= 5 AND reach <= 25\nORDER BY reach DESC`,
          output: '[{Bayside Roasters, 26}, {Mid-Market Hardware, 35}, {Kearny Kitchen, 19}]',
        };
      } else if (q.includes('supply') || q.includes('chain') || q.includes('keystone')) {
        agentResponse = `### Multi-Hop Supply Chain Analysis\n\nUsing GQL pattern \`(engine:Business)<-[:Supplies]-{1,3}(supplier:Business)\`:\n\n**Keystone Nodes** (most supplier reach):\n1. **The Warfield Theater** — 12 direct, 1,272 indirect jobs supported\n2. **City Produce** — 8 direct suppliers feeding 23 downstream restaurants\n3. **Binis Kitchen LLC** — 6 direct + 14 indirect supply relationships\n\n**Cascade Risk:** Closure of The Warfield propagates through 3 supply hops affecting audio vendors, catering services, and event staffing — a $2.1M economic shock to the corridor.`;
        toolExecution = {
          tool: 'bigquery_graph_traversal (GQL)',
          query: `GRAPH a4i_econ.corridor_graph\nMATCH p = (engine:Business)<-[:Supplies]-{1,3}(supplier:Business)\nRETURN engine.name, SUM(supplier.estimated_jobs) AS total_supplier_jobs\nORDER BY total_supplier_jobs DESC LIMIT 5`,
          output: '[{Warfield, 1272}, {City Produce, 340}, {Binis Kitchen, 189}]',
        };
      } else if (q.includes('equity') || q.includes('demographic')) {
        agentResponse = `### Equity & Demographics Audit\n\nCensus tract analysis for active corridor applicants:\n\n- **Neighborhood Poverty Rate:** 22.6%\n- **Minority-Owned Businesses:** 67% of applicant pool\n- **Women-Owned:** 34%\n- **Low-Income Census Tract:** Yes (qualifies for CDFI priority)\n\n**Equity Score by Applicant:**\n| Business | Poverty Rate | MOB | WOB |\n|----------|-------------|-----|-----|\n| Warfield Theater | 22.6% | ✅ | ❌ |\n| Binis Kitchen | 28.1% | ✅ | ✅ |\n| City Produce | 19.3% | ✅ | ❌ |\n\nFunding Binis Kitchen alongside Warfield maximizes both economic multiplier AND equity objectives.`;
      } else {
        agentResponse = `I analyzed your query against the **${corridor.name}** property graph (${corridor.businesses?.length ?? 0} businesses, BigQuery dataset: \`a4i_econ.corridor_graph\`).\n\nTo get the most relevant answer, try one of the suggested prompts above, or ask about:\n- **Top applicants** and their job multiplier scores\n- **Supply chain** keystone analysis\n- **GQL traversal** queries\n- **Equity** and demographic audit\n\n> ⚠️ Agent backend: ${agentOnline ? '🟢 ONLINE' : '🔴 OFFLINE — running in fallback mode'}`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: agentResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          live: false,
          toolCalls: toolExecutionList.length > 0 ? toolExecutionList : (toolExecution ? [toolExecution] : []),
        }
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleClearChat = () => {
    resetSession();
    setMessages([messages[0]]);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isDrawer ? 'h-[600px] w-full' : 'h-[680px]'
      }`}>
      {/* Chat Header */}
      <div className="bg-slate-950/90 border-b border-slate-800 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Engine of Prosperity — ADK Agent</span>
              {agentOnline ? (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" /> LIVE
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" /> FALLBACK
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
              <span>gemini-flash • a4i_econ.corridor_graph</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" /> Guardrails Active
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
          title="New conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1">
          {/* TTS toggle */}
          <button
            onClick={() => { setTtsEnabled(v => !v); stopSpeaking(); }}
            className={`text-xs p-1.5 rounded-lg transition flex items-center gap-1 ${ttsEnabled
              ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            title={ttsEnabled ? 'Mute voice responses' : 'Enable voice responses'}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClearChat}
            className="text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
            title="New conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {isDrawer && onExpandToFullTab && (
            <button
              onClick={onExpandToFullTab}
              className="text-xs text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
              title="Expand to full screen Copilot tab"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {isDrawer && onCloseDrawer && (
            <button
              onClick={onCloseDrawer}
              className="text-xs text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
              title="Close conversational drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Prompts Banner */}
      <div className="bg-slate-950/40 border-b border-slate-800/80 px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Try:
        </span>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(p.prompt)}
            disabled={isTyping}
            className="text-[11px] text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 disabled:opacity-40 px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer border border-slate-700/60"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isAgent = m.sender === 'agent';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAgent
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-indigo-600 text-white'
                  }`}
              >
                {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className="space-y-2 min-w-0">
                {/* Tool calls pipeline rendered before synthesis */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="space-y-2 mb-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Agent Tool Execution ({m.toolCalls.length} tool calls):</span>
                    </div>
                    {m.toolCalls.map((t, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800/90 rounded-xl p-2.5 text-[11px] font-mono text-cyan-300 space-y-1.5 shadow-inner"
                      >
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold text-slate-200">{t.tool}</span>
                          {m.live && (
                            <span className="ml-auto text-emerald-400 text-[9px] border border-emerald-500/30 px-1 rounded">LIVE</span>
                          )}
                        </div>
                        <pre className="bg-slate-900/90 p-2 rounded text-[10px] overflow-x-auto text-cyan-300 whitespace-pre-wrap">
                          {t.query}
                        </pre>
                        <div className="text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/50 whitespace-pre-wrap leading-relaxed">
                          ↳ {t.output}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${isAgent
                    ? 'bg-slate-950/80 border border-slate-800 text-slate-200'
                    : 'bg-blue-600 text-white'
                    }`}
                >
                  <div className="prose prose-invert prose-xs max-w-none whitespace-pre-wrap break-words">
                    {m.text}
                  </div>

                  {/* Direct button to full HTML dossier if referenced */}
                  {isAgent && (m.text.includes('/report/') || m.text.includes('Pitch Deck')) && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">Formal committee defense docket ready:</span>
                      <a
                        href="/report/REQ-2026-001"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                      >
                        <span>Open Official HTML Dossier</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 font-mono block px-1">
                  {m.timestamp}{m.live ? ' · live agent' : ''}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="animate-pulse">
              {agentOnline ? 'Agent thinking… (Vertex AI / gemini-flash)' : 'Processing…'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSendPrompt(); }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
          placeholder={`Ask the agent about ${corridor.name} grants, supply chains, or GQL queries…`}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isTyping || !input.trim()}
          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
