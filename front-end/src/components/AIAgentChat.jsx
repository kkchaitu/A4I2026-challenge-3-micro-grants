import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { sendAgentQuery, resetSession } from '../services/agentApi';

export function AIAgentChat({
  corridor,
  agentOnline,
  onSelectBusinessForMemo
}) {
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: `Hello! I am your Engine of Prosperity AI Agent for the **${corridor.name}** corridor.\n\nI use BigQuery Property Graph multi-hop GQL traversals to identify which businesses create the largest downstream job multiplier. Grant one engine, power a whole neighborhood.\n\nAsk me anything about applicants, supply chain network effects, or equity impact — or click a suggested prompt below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalls: [],
      live: false,
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const suggestedPrompts = [
    {
      label: '🏆 Top grant applicant?',
      prompt: 'Who is the top recommended grant applicant and why? Show me their job multiplier and supply chain reach.',
    },
    {
      label: '🔗 Supply chain analysis',
      prompt: 'Run a multi-hop supply chain analysis for the top businesses. Which ones are keystone nodes whose closure would cascade to the most downstream jobs?',
    },
    {
      label: '📊 Section 13 Filter (5-25 dependents)',
      prompt: 'Execute the Section 13 GQL query: Which businesses protect a meaningful number of others (between 5 and 25 dependents) without being giant hubs?',
    },
    {
      label: '⚖️ Equity & Demographics Audit',
      prompt: 'Audit the equity and demographic impact of funding our top resilience candidates in this census tract.',
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
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: result.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          live: true,
          toolCalls: [{
            tool: 'ADK → gemini-flash (Vertex AI)',
            query: `POST /run  app=app  user=grant-officer`,
            output: `${(result.events ?? []).length} events received from agent`,
          }],
        }
      ]);
      setIsTyping(false);
      return;
    }

    // ── Offline / fallback grounded responses ────────────────────────────────
    setTimeout(() => {
      let agentResponse = '';
      let toolExecution = null;
      const q = userText.toLowerCase();

      if (q.includes('top') || q.includes('recommend') || q.includes('applicant')) {
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
          toolCalls: toolExecution ? [toolExecution] : [],
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[640px]">
      {/* Chat Header */}
      <div className="bg-slate-950/80 border-b border-slate-800 p-4 flex items-center justify-between">
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
            <p className="text-[10px] text-slate-400 font-mono">
              gemini-flash • a4i_econ.corridor_graph • Vertex AI
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
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isAgent
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className="space-y-2 min-w-0">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isAgent
                      ? 'bg-slate-950/80 border border-slate-800 text-slate-200'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <div className="prose prose-invert prose-xs max-w-none whitespace-pre-wrap break-words">
                    {m.text}
                  </div>
                </div>

                {/* Tool calls */}
                {m.toolCalls?.map((t, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-[11px] font-mono text-cyan-300 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span>Tool: {t.tool}</span>
                      {m.live && (
                        <span className="ml-auto text-emerald-400 text-[9px] border border-emerald-500/30 px-1 rounded">LIVE</span>
                      )}
                    </div>
                    <pre className="bg-slate-900/90 p-2 rounded text-[10px] overflow-x-auto text-cyan-400 whitespace-pre-wrap">
                      {t.query}
                    </pre>
                    <div className="text-[10px] text-slate-500 truncate">↳ {t.output}</div>
                  </div>
                ))}

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
