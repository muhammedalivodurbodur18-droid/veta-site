// Veta demo AI proxy.
// Keeps the Groq API key on the server (env var GROQ_API_KEY) so visitors can use AI without their own key.
// Guards: same-origin only, per-IP hourly limit, allowed models only, capped message size and output tokens.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
const LIMIT_PER_HOUR = Number(process.env.VETA_AI_LIMIT_PER_HOUR || 30);
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // per function instance; a soft limit on top of Groq's own limits

function getKey() {
  let k = '';
  try { if (globalThis.Netlify && Netlify.env) k = Netlify.env.get('GROQ_API_KEY') || ''; } catch (e) {}
  if (!k) k = process.env.GROQ_API_KEY || '';
  return String(k).trim();
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
function err(message, status) { return json({ error: { message } }, status); }

export default async (req, context) => {
  const key = getKey();
  if (req.method === 'GET') return json({ ok: !!key, provider: 'groq', limitPerHour: LIMIT_PER_HOUR });
  if (req.method !== 'POST') return err('Method not allowed', 405);
  if (!key) return err('The demo AI is not configured yet.', 503);

  // Same-origin only, so other sites cannot spend this key.
  const origin = req.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== new URL(req.url).host) return err('Forbidden', 403); } catch (e) { return err('Forbidden', 403); }
  }

  // Soft per-IP limit.
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT_PER_HOUR) return err('Hourly demo limit reached. Try again later or add your own Groq key.', 429);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();

  let body;
  try {
    const text = await req.text();
    if (text.length > 80000) return err('Request too large', 413);
    body = JSON.parse(text);
  } catch (e) { return err('Invalid JSON', 400); }

  const roles = ['system', 'user', 'assistant'];
  const messages = (Array.isArray(body.messages) ? body.messages : []).slice(-24).map((m) => ({
    role: roles.includes(m && m.role) ? m.role : 'user',
    content: String((m && m.content) || '').slice(0, 14000)
  })).filter((m) => m.content);
  if (!messages.length) return err('No messages', 400);

  const payload = {
    model: MODELS.includes(body.model) ? body.model : MODELS[0],
    messages,
    temperature: Math.min(1, Math.max(0, Number(body.temperature) || 0.5)),
    max_tokens: Math.min(3000, Math.max(50, Number(body.max_tokens) || 1500)),
    stream: !!body.stream
  };

  let up;
  try {
    up = await fetch(GROQ_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(payload) });
  } catch (e) { return err('Could not reach the AI provider.', 502); }

  if (!up.ok) {
    let message = 'AI provider error';
    try { const j = await up.json(); message = (j && j.error && j.error.message) || message; } catch (e) {}
    // Never pass auth errors through as 401, so the browser does not think the visitor's own key is wrong.
    const status = up.status === 429 ? 429 : up.status === 401 || up.status === 403 ? 502 : up.status;
    return err(message, status);
  }
  return new Response(up.body, { status: 200, headers: { 'Content-Type': up.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/ai' };
