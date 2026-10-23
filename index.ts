// Supabase Edge Function: send-push
// Deploy:  supabase functions deploy send-push --no-verify-jwt
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com PUSH_SECRET=<long random string>
//
// Call it with:  POST <project>/functions/v1/send-push
//   header  x-push-secret: <PUSH_SECRET>
//   body    { "user_id": "<uuid>" }  or  { "user_ids": ["<uuid>", ...] }  or  { "broadcast": true }
//           plus { "title": "...", "body": "...", "url": "/?page=...", "icon": "images/...", "tag": "..." }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUSH_SECRET = Deno.env.get("PUSH_SECRET") ?? "";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const sb = createClient(SB_URL, SB_KEY);
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!PUSH_SECRET || req.headers.get("x-push-secret") !== PUSH_SECRET) return json({ error: "unauthorized" }, 401);

  let p: any;
  try { p = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!p.title) return json({ error: "title required" }, 400);

  const payload = JSON.stringify({
    title: String(p.title).slice(0, 100),
    body: String(p.body ?? "").slice(0, 300),
    url: p.url ?? "/",
    icon: p.icon,
    tag: p.tag,
  });

  const ids: string[] | null = p.broadcast ? null : (p.user_ids ?? (p.user_id ? [p.user_id] : []));
  if (ids && !ids.length) return json({ error: "no target: pass user_id, user_ids or broadcast" }, 400);

  let sent = 0, removed = 0, failed = 0, from = 0;
  const PAGE = 500;
  while (true) {
    let q = sb.from("push_subscriptions").select("endpoint,p256dh,auth").range(from, from + PAGE - 1);
    if (ids) q = q.in("user_id", ids);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    if (!data || !data.length) break;

    const results = await Promise.allSettled(
      data.map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 })
      ),
    );
    const dead: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") sent++;
      else {
        const code = (r.reason as any)?.statusCode;
        if (code === 404 || code === 410) dead.push(data[i].endpoint); else failed++;
      }
    });
    if (dead.length) { await sb.from("push_subscriptions").delete().in("endpoint", dead); removed += dead.length; }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return json({ sent, removed, failed });
});
