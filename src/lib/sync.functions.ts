import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseICal, guessPlatform, isBlockedEvent } from "./ical";

export const syncIcalSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sourceId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: source, error: srcErr } = await supabase
      .from("ical_sources")
      .select("*")
      .eq("id", data.sourceId)
      .single();

    if (srcErr || !source) throw new Error("Fuente iCal no encontrada");

    let text: string;
    try {
      const res = await fetch(source.url, {
        headers: { "User-Agent": "MDQ-Deptos/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      await supabase
        .from("ical_sources")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_message: msg,
        })
        .eq("id", source.id);
      throw new Error("No se pudo descargar el iCal: " + msg);
    }

    const events = parseICal(text);
    const platform = source.platform || guessPlatform(source.url);
    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const ev of events) {
      if (isBlockedEvent(ev.summary)) {
        skipped++;
        continue;
      }
      const guestGuess =
        ev.summary?.replace(/reserved|reservation|closed/gi, "").trim() ||
        "Huésped";

      // Extract booking reference from description if present
      const notes = ev.description || "";

      const { data: existing } = await supabase
        .from("reservations")
        .select("id")
        .eq("ical_source_id", source.id)
        .eq("ical_uid", ev.uid)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("reservations")
          .update({
            check_in: ev.start,
            check_out: ev.end,
            notes: notes || null,
          })
          .eq("id", existing.id);
        updated++;
      } else {
        const { error: insErr } = await supabase.from("reservations").insert({
          apartment_id: source.apartment_id,
          platform,
          guest_name: guestGuess,
          check_in: ev.start,
          check_out: ev.end,
          currency: "ARS",
          status: "confirmed",
          source: "ical",
          ical_uid: ev.uid,
          ical_source_id: source.id,
          notes: notes || null,
          created_by: userId,
        });
        if (!insErr) inserted++;
      }
    }

    await supabase
      .from("ical_sources")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "ok",
        last_sync_message: `${inserted} nuevas · ${updated} actualizadas · ${skipped} bloqueos ignorados`,
      })
      .eq("id", source.id);

    return { inserted, updated, skipped };
  });
