// Supabase Edge Function: send-push
// Trigger: Database Webhook on INSERT into public.yaps_notifications (see push-setup.md).
// Sends a Web Push to the recipient's devices (user_id), or to everyone when user_id is null.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:you@example.com";
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function message(n: any) {
  const who = n.actor_name || "Someone";
  switch (n.type) {
    case "like":    return { title: "New like", body: `${who} liked ${n.track_title || "your track"}` };
    case "comment": return { title: "New comment", body: n.body || `${who} commented on ${n.track_title || "your track"}` };
    case "follow":  return { title: "New follower", body: `${who} started following you` };
    case "repost":  return { title: "Reposted", body: `${who} reposted ${n.track_title || "your track"}` };
    case "mention": return { title: "You were mentioned", body: n.body || `${who} mentioned you` };
    case "release": return { title: "New release", body: `${who} released ${n.track_title || "a new track"}` };
    case "message": return { title: who, body: n.body || "Sent you a message" };
    default:        return { title: "YAPS Music", body: n.body || "You have a new notification" };
  }
}

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  const n = payload?.record;
  if (!n) return new Response("no record", { status: 400 });

  let q = sb.from("push_subscriptions").select("endpoint,p256dh,auth");
  if (n.user_id) q = q.eq("user_id", n.user_id);
  const { data: subs, error } = await q.limit(5000);
  if (error) return new Response(error.message, { status: 500 });

  const m = message(n);
  const body = JSON.stringify({
    title: m.title, body: m.body, icon: n.actor_avatar || n.track_img || "images/yaps-cover.png",
    tag: `${n.type}-${n.id}`, url: "./?page=notifications",
  });

  const dead: string[] = [];
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 },
      );
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint);
    }
  }));
  if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);

  return new Response(JSON.stringify({ sent: (subs?.length ?? 0) - dead.length, removed: dead.length }), {
    headers: { "content-type": "application/json" },
  });
});
