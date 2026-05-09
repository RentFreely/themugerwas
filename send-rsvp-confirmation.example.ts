// Supabase Edge Function example (Deno)
// Deploy as: supabase functions deploy send-rsvp-confirmation
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = await req.json();
  // Integrate with Resend / SendGrid here.
  // Example payload:
  // { full_name, email, attending, guest_count, meal, submitted_at }
  console.log("Send RSVP confirmation", body.email, body.full_name);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
