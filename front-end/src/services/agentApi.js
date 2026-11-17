// Agent API Client — connects to the my-agent ADK FastAPI backend (port 8000 via Vite proxy)
// All paths are relative (no host) so Vite proxies them to http://127.0.0.1:8000

const APP_NAME   = 'app';
const USER_ID    = 'grant-officer';

// ─── Session management ────────────────────────────────────────────────────────
// We lazily create one session per browser tab and cache its ID in memory.
let _sessionId = null;

async function getOrCreateSession() {
  if (_sessionId) return _sessionId;
  try {
    const res = await fetch(`/apps/${APP_NAME}/users/${USER_ID}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      _sessionId = data.id;
      return _sessionId;
    }
  } catch (err) {
    console.warn('[agentApi] Session creation failed:', err.message);
  }
  return null;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export async function checkAgentHealth() {
  try {
    const res = await fetch('/health', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { online: true, status: data.status || 'healthy' };
    }
  } catch (_) {
    // silent — agent simply not reachable yet
  }
  return { online: false, error: 'Agent backend unreachable' };
}

// ─── Live grant requests ───────────────────────────────────────────────────────
export async function fetchLiveRequests() {
  try {
    const res = await fetch('/api/requests');
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[agentApi] fetchLiveRequests failed:', err.message);
  }
  return null;
}

// ─── Single request detail ─────────────────────────────────────────────────────
export async function fetchRequestDetail(requestId) {
  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[agentApi] fetchRequestDetail failed:', err.message);
  }
  return null;
}

// ─── Business metrics ─────────────────────────────────────────────────────────
export async function fetchBusinessMetrics(businessId, amount = 50000, purpose = 'Expansion') {
  try {
    const res = await fetch(
      `/api/metrics/${encodeURIComponent(businessId)}?amount=${amount}&purpose=${encodeURIComponent(purpose)}`
    );
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[agentApi] fetchBusinessMetrics failed:', err.message);
  }
  return null;
}

// ─── Trigger evaluation ────────────────────────────────────────────────────────
export async function triggerEvaluateRequest(requestId) {
  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}/evaluate`, {
      method: 'POST',
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[agentApi] triggerEvaluateRequest failed:', err.message);
  }
  return null;
}

// ─── Send chat message to live agent ──────────────────────────────────────────
// Uses the ADK POST /run endpoint.
// Returns { success: boolean, text: string, events?: array }
export async function sendAgentQuery(message) {
  const sessionId = await getOrCreateSession();
  if (!sessionId) {
    return { success: false, error: 'Could not create agent session' };
  }

  try {
    const res = await fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name:   APP_NAME,
        user_id:    USER_ID,
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }],
        },
      }),
    });

    if (res.ok) {
      const events = await res.json();
      // ADK returns an array of events; find the last model text response
      const textParts = [];
      const toolCalls = [];
      if (Array.isArray(events)) {
        for (const event of events) {
          const parts = event?.content?.parts ?? [];
          for (const part of parts) {
            if (part.text && event?.content?.role === 'model') {
              textParts.push(part.text.trim());
            }
            if (part.function_call) {
              const fnName = part.function_call.name || 'tool';
              const fnArgs = part.function_call.args || {};
              toolCalls.push({
                tool: fnName,
                query: `${fnName}(${JSON.stringify(fnArgs)})`,
                output: 'Executing on BigQuery Property Graph...',
              });
            }
            if (part.function_response) {
              const fnName = part.function_response.name || 'tool';
              const fnResp = part.function_response.response || {};
              const formattedResp = typeof fnResp === 'object' ? JSON.stringify(fnResp, null, 2) : String(fnResp);
              const existing = toolCalls.find(tc => tc.tool === fnName && tc.output.includes('Executing'));
              if (existing) {
                existing.output = formattedResp;
              } else {
                toolCalls.push({
                  tool: fnName,
                  query: `${fnName}() response`,
                  output: formattedResp,
                });
              }
            }
          }
        }
      }
      const text = textParts.length > 0
        ? textParts[textParts.length - 1]   // take final model turn
        : (typeof events === 'string' ? events : JSON.stringify(events, null, 2));
      return { success: true, text, events, toolCalls };
    }

    // Session expired — reset and surface error
    if (res.status === 404) {
      _sessionId = null;
      return { success: false, error: 'Session expired — please try again' };
    }

    const errText = await res.text().catch(() => res.statusText);
    return { success: false, error: `Agent returned ${res.status}: ${errText}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Reset session (call when user wants a fresh conversation) ─────────────────
export function resetSession() {
  _sessionId = null;
}
