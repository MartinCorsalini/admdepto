import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { useMemo, useState } from "react";
import { ReservationForm } from "@/components/reservation-form";
import { Plus, Search } from "lucide-react";
import { fmtARS, ownerNet, platformColor, totalArs } from "@/lib/finance";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({ meta: [{ title: "Reservas · Deptos MDQ" }] }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [apt, setApt] = useState<string | "all">("all");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past" | "current">("upcoming");

  const { data: apartments = [] } = useQuery({
    queryKey: ["apartments"],
    queryFn: async () => (await supabase.from("apartments").select("*").order("name")).data || [],
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", "list"],
    queryFn: async () =>
      (await supabase.from("reservations").select("*").order("check_in", { ascending: false })).data || [],
  });

  const now = new Date();
  const list = useMemo(() => {
    return reservations
      .filter((r: any) => apt === "all" || r.apartment_id === apt)
      .filter((r: any) => {
        const ci = parseISO(r.check_in);
        const co = parseISO(r.check_out);
        if (filter === "upcoming") return ci >= now;
        if (filter === "past") return co < now;
        if (filter === "current") return ci <= now && co > now;
        return true;
      })
      .filter((r: any) => {
        if (!q) return true;
        const s = q.toLowerCase();
        return (
          (r.guest_name || "").toLowerCase().includes(s) ||
          (r.platform || "").toLowerCase().includes(s) ||
          (r.notes || "").toLowerCase().includes(s)
        );
      });
  }, [reservations, apt, filter, q, now]);

  return (
    <>
      <TopBar title="Reservas" subtitle={`${list.length} resultados`} />
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar huésped, plataforma..."
            className="w-full pl-9 pr-4 py-2.5 rounded-full border bg-card outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["upcoming","current","past","all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${filter===f?"bg-foreground text-background":"hover:bg-accent"}`}
            >
              {f === "upcoming" ? "Próximas" : f === "current" ? "En curso" : f === "past" ? "Pasadas" : "Todas"}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          <button onClick={() => setApt("all")} className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${apt==="all"?"bg-foreground text-background":"hover:bg-accent"}`}>Todos</button>
          {apartments.map((a: any) => (
            <button
              key={a.id}
              onClick={() => setApt(a.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${apt===a.id?"text-white":"hover:bg-accent"}`}
              style={apt===a.id ? { backgroundColor: a.color, borderColor: a.color } : {}}
            >
              {a.name}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {list.map((r: any) => {
            const a = apartments.find((x: any) => x.id === r.apartment_id);
            return (
              <button
                key={r.id}
                onClick={() => setEditing(r)}
                className="w-full bg-card border rounded-2xl p-4 shadow-card hover:bg-accent/40 text-left"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white text-sm font-bold" style={{ backgroundColor: a?.color }}>
                    {a?.name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-semibold truncate">{r.guest_name || "Sin nombre"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${platformColor[r.platform] || "bg-muted"}`}>{r.platform}</span>
                      {r.source === "ical" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-semibold">iCal</span>}
                      {r.separated && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success text-success-foreground font-semibold">Separado</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(r.check_in), "d MMM", { locale: es })} → {format(parseISO(r.check_out), "d MMM", { locale: es })} · {r.nights} noches · {a?.name}
                    </div>
                    {r.notes && <div className="text-xs text-muted-foreground truncate mt-1">{r.notes}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{fmtARS(totalArs(r))}</div>
                    <div className="text-[11px] text-muted-foreground">neto {fmtARS(ownerNet(r))}</div>
                  </div>
                </div>
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10 border rounded-2xl bg-muted/30">
              Sin resultados.
            </div>
          )}
        </div>
      </main>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-elevated grid place-items-center hover:scale-105 transition"
      >
        <Plus className="h-6 w-6" />
      </button>

      {open && <ReservationForm apartments={apartments} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />}
      {editing && (
        <ReservationForm
          apartments={apartments}
          reservationId={editing.id}
          initial={{
            apartment_id: editing.apartment_id,
            platform: editing.platform,
            guest_name: editing.guest_name || "",
            check_in: editing.check_in,
            check_out: editing.check_out,
            currency: editing.currency,
            amount_usd: String(editing.amount_usd ?? ""),
            amount_ars: String(editing.amount_ars ?? ""),
            exchange_rate: String(editing.exchange_rate ?? ""),
            cleaning_fee_ars: String(editing.cleaning_fee_ars ?? ""),
            booking_commission_usd: String(editing.booking_commission_usd ?? ""),
            booking_commission_ars: String(editing.booking_commission_ars ?? ""),
            admin_percentage: String(editing.admin_percentage ?? 20),
            supplies_cost_ars: String(editing.supplies_cost_ars ?? ""),
            supplies_description: editing.supplies_description || "",
            separated: editing.separated,
            status: editing.status,
            notes: editing.notes || "",
          }}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </>
  );
}
