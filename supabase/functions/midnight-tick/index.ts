// Deploy as a Supabase Edge Function and invoke nightly via pg_cron / scheduled trigger.
// Finalizes DCS, streak, GP, evolution, sync points and marriage using the user's timezone.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data: profiles, error } = await supabase.from("profiles").select("id, timezone");
  if (error) return new Response(error.message, { status: 500 });
  return new Response(
    JSON.stringify({
      ok: true,
      users: profiles?.length ?? 0,
      note: "Port finalizePending() from lib/store.ts here when going live.",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
