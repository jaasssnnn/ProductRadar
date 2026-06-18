// Token store — persists OAuth session tokens for Stripe Connect.
//
// Production (Vercel): uses Vercel KV when KV_REST_API_URL is set.
//   Set up: add a KV store to your Vercel project (Storage tab → KV),
//   then Vercel auto-injects KV_REST_API_URL and KV_REST_API_TOKEN.
//
// Local dev: falls back to an in-memory Map. Tokens are lost on server
//   restart, which is fine locally — just reconnect Stripe.

const _store = new Map();

async function kv() {
  if (!process.env.KV_REST_API_URL) return null;
  const { kv } = await import('@vercel/kv');
  return kv;
}

export async function getToken(sessionId) {
  const store = await kv();
  if (store) return store.get(`session:${sessionId}`);
  return _store.get(sessionId) ?? null;
}

export async function setToken(sessionId, data) {
  const store = await kv();
  if (store) {
    await store.set(`session:${sessionId}`, data, { ex: 60 * 60 * 24 * 30 });
    return;
  }
  _store.set(sessionId, data);
}

export async function deleteToken(sessionId) {
  const store = await kv();
  if (store) {
    await store.del(`session:${sessionId}`);
    return;
  }
  _store.delete(sessionId);
}
