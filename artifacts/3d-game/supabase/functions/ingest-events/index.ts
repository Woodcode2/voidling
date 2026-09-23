// VOIDLING analytics ingest: accepts a batch of events from the game client
// and appends them to vd_events with the service role (table has no anon access).
//
// ── THIS FILE IS THE FIX, AND IT IS NOT DEPLOYED YET ────────────────────────
// Until 2026-09-23 this function existed only on Supabase, unversioned, and it
// drifted from the client it serves. The deployed version (v1) does:
//
//     const userId = String(body.user_id ?? '').slice(0, 64);
//     if (!userId || !sessionId || events.length === 0)
//       return new Response('missing fields', { status: 400 });
//
// …and src/game/analytics.ts stopped sending `user_id` on purpose, because a
// persistent per-install identifier collected from a child IS personal
// information under COPPA, and Apple's Kids rules forbid sending device
// information to third parties. The client was right. The server never heard.
// So every batch from the 3D game — from any grown-up who switched statistics
// on behind the parental gate — has been answered 400 and dropped.
//
// Not a privacy leak: the opposite. Nothing was stored. But the policy promises
// anonymous statistics a parent can opt into, and that promise has quietly not
// been kept.
//
// The change: `user_id` is accepted if present (the retired 2D build shares this
// pipeline and still sends one) and NOT required. session_id stays required — it
// is per-boot, never persisted, and is the only thing that groups a batch.
//
// Deploy: owner's call — it is production infrastructure. Either
//   supabase functions deploy ingest-events --project-ref uzkzuxwykajzoicuxhic
// or approve the crew deploying it through the Supabase connector.
// Check first that vd_events.user_id is nullable; if it is NOT NULL, this insert
// fails with a 500 and the column needs `alter table vd_events alter column
// user_id drop not null;` in the same change.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BATCH = 50;
const MAX_PROPS_BYTES = 2048;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: CORS });

  let body: { user_id?: string; session_id?: string; app_version?: string; platform?: string; events?: Array<{ event?: string; ts?: number; props?: Record<string, unknown> }> };
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400, headers: CORS });
  }

  // OPTIONAL: the 3D game sends none, by design. See the header.
  const userId = String(body.user_id ?? '').slice(0, 64) || null;
  const sessionId = String(body.session_id ?? '').slice(0, 64);
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
  if (!sessionId || events.length === 0) {
    return new Response('missing fields', { status: 400, headers: CORS });
  }

  const rows = [];
  for (const e of events) {
    const name = String(e.event ?? '').slice(0, 64);
    if (!name) continue;
    let props = e.props && typeof e.props === 'object' ? e.props : {};
    if (JSON.stringify(props).length > MAX_PROPS_BYTES) props = { truncated: true };
    rows.push({
      client_ts: typeof e.ts === 'number' ? new Date(e.ts).toISOString() : null,
      user_id: userId,
      session_id: sessionId,
      event: name,
      props,
      app_version: String(body.app_version ?? '').slice(0, 32) || null,
      platform: String(body.platform ?? '').slice(0, 16) || null,
    });
  }
  if (!rows.length) return new Response('no valid events', { status: 400, headers: CORS });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await supabase.from('vd_events').insert(rows);
  if (error) {
    console.error('insert failed', error.message);
    return new Response('insert failed', { status: 500, headers: CORS });
  }
  return new Response(JSON.stringify({ ok: true, n: rows.length }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
