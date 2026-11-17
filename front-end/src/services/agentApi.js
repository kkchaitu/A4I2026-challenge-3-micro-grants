// Agent API Client for communicating with the my-agent backend (FastAPI / ADK)

const DEFAULT_AGENT_BASE = ''; // Uses Vite proxy to http://127.0.0.1:8000

export async function checkAgentHealth(baseUrl = DEFAULT_AGENT_BASE) {
  try {
    const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { online: true, status: data.status || 'healthy' };
    }
  } catch (err) {
    // try fallback direct port 8000 in case proxy is bypassed
    try {
      const direct = await fetch('http://127.0.0.1:8000/health', { method: 'GET' });
      if (direct.ok) return { online: true, status: 'healthy', directUrl: 'http://127.0.0.1:8000' };
    } catch (_) {}
  }
  return { online: false, error: 'Agent backend unreachable' };
}

export async function fetchLiveRequests(baseUrl = DEFAULT_AGENT_BASE) {
  try {
    const res = await fetch(`${baseUrl}/api/requests`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch live agent requests, using corridor state:', err);
  }
  return null;
}

export async function fetchBusinessMetrics(businessId, amount = 50000, purpose = 'Expansion', baseUrl = DEFAULT_AGENT_BASE) {
  try {
    const res = await fetch(`${baseUrl}/api/metrics/${encodeURIComponent(businessId)}?amount=${amount}&purpose=${encodeURIComponent(purpose)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch metrics for', businessId, err);
  }
  return null;
}

export async function triggerEvaluateRequest(requestId, baseUrl = DEFAULT_AGENT_BASE) {
  try {
    const res = await fetch(`${baseUrl}/api/requests/${encodeURIComponent(requestId)}/evaluate`, {
      method: 'POST',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Evaluate request failed:', err);
  }
  return null;
}

export async function sendAgentQuery(message, baseUrl = DEFAULT_AGENT_BASE) {
  try {
    // First try reasoning_engine SDK proxy route
    const res = await fetch(`${baseUrl}/api/reasoning_engine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: message }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, text: data.output || data.response || JSON.stringify(data) };
    }
  } catch (err) {
    console.warn('Reasoning engine query failed:', err);
  }

  // Fallback try /run ADK route
  try {
    const runRes = await fetch(`${baseUrl}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_name: 'my_agent',
        user_id: 'grant-officer',
        session_id: 'session-demo',
        content: message,
      }),
    });
    if (runRes.ok) {
      const data = await runRes.json();
      return { success: true, text: data.content || JSON.stringify(data) };
    }
  } catch (err) {
    console.warn('/run route failed:', err);
  }

  return { success: false, error: 'Agent backend not responding' };
}
