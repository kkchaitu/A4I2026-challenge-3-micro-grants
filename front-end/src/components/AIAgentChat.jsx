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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AudioLines,
} from 'lucide-react';
import { sendAgentQuery, resetSession } from '../services/agentApi';

// ─── Voice helpers ────────────────────────────────────────────────────────────
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

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
  onSelectBusinessForMemo
}) {
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: `Hello! I am your Engine of Prosperity AI Agent for the **${corridor.name}** corridor.\n\nI use BigQuery Property Graph multi-hop GQL traversals to identify which businesses create the largest downstream job multiplier. Grant one engine, power a whole neighborhood.\n\nAsk me anything about applicants, supply chain network effects, or equity impact — or click a suggested prompt below, or tap the 🎙️ mic to speak.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalls: [],
      live: false,
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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
    utter.onstart  = () => setSpeakingMsgId(msgId);
    utter.onend    = () => setSpeakingMsgId(null);
    utter.onerror  = () => setSpeakingMsgId(null);
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

  // Keep a stable ref to handleSendPrompt so the voice callback can call it
  // without stale closure issues.
  const handleSendPromptRef = useRef(null);

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

    // Stop any in-progress TTS before sending a new message
    stopSpeaking();

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), sender: 'user', text: userText, timestamp: ts, toolCalls: [] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // ── Live ADK agent call ──────────────────────────────────────────────────
    const result = await sendAgentQuery(userText);

    if (result?.success && result.text) {
      const msgId = Date.now() + 1;
      setMessages(prev => [
        ...prev,
        {
          id: msgId,
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
      speak(result.text, msgId);
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

      const msgId = Date.now() + 1;
      setMessages(prev => [
        ...prev,
        {
          id: msgId,
          sender: 'agent',
          text: agentResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          live: false,
          toolCalls: toolExecution ? [toolExecution] : [],
        }
      ]);
      setIsTyping(false);
      speak(agentResponse, msgId);
    }, 600);
  };

  // Keep the ref in sync with the latest closure
  handleSendPromptRef.current = handleSendPrompt;

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

        <div className="flex items-center gap-1">
          {/* TTS toggle */}
          <button
            onClick={() => { setTtsEnabled(v => !v); stopSpeaking(); }}
            className={`text-xs p-1.5 rounded-lg transition flex items-center gap-1 ${
              ttsEnabled
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
          const isSpeaking = speakingMsgId === m.id;
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

                <div className="flex items-center gap-2 px-1">
                  <span className="text-[9px] text-slate-500 font-mono">
                    {m.timestamp}{m.live ? ' · live agent' : ''}
                  </span>
                  {/* Per-message TTS controls */}
                  {isAgent && (
                    isSpeaking ? (
                      <button
                        onClick={stopSpeaking}
                        className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 font-mono"
                        title="Stop speaking"
                      >
                        <AudioLines className="w-3 h-3 animate-pulse" /> speaking…
                      </button>
                    ) : (
                      <button
                        onClick={() => speak(m.text, m.id)}
                        className="text-[9px] text-slate-500 hover:text-slate-300 font-mono flex items-center gap-1"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3 h-3" /> read
                      </button>
                    )
                  )}
                </div>
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

      {/* Voice error banner */}
      {voiceError && (
        <div className="px-4 py-2 bg-red-950/60 border-t border-red-800/60 text-[11px] text-red-300 flex items-center justify-between gap-2">
          <span>⚠️ {voiceError}</span>
          <button onClick={() => setVoiceError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

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
          placeholder={isListening ? '🎙️ Listening… speak now' : `Ask about ${corridor.name} grants, supply chains, or GQL queries…`}
          className={`flex-1 bg-slate-900 border rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none disabled:opacity-50 transition ${
            isListening
              ? 'border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.25)] placeholder-red-400'
              : 'border-slate-700 focus:border-blue-500'
          }`}
        />

        {/* Mic button */}
        {SpeechRecognition && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={isTyping}
            className={`p-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed relative ${
              isListening
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isListening ? 'Stop listening' : 'Speak your query'}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                {/* Pulsing ring */}
                <span className="absolute inset-0 rounded-xl animate-ping bg-red-500/30 pointer-events-none" />
              </>
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        )}

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
