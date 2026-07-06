import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { useMemo, useState } from "react";
import { ReservationForm } from "@/components/reservation-form";
import { Plus, TrendingUp, CalendarClock, Bed } from "lucide-react";
import { fmtARS, ownerNet, platformColor } from "@/lib/finance";
import { differenceInCalendarDays, format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Inicio · Deptos MDQ" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [open, setOpen] = useState(false);
  const { data: apartments = [] } = useQuery({
    queryKey: ["apartments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("apartments").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", "dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("check_in", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const stats = useMemo(() => {
    const inMonth = reservations.filter((r: any) => {
      const ci = parseISO(r.check_in);
      return isWithinInterval(ci, { start: monthStart, end: monthEnd });
    });
    const upcoming = reservations.filter((r: any) => parseISO(r.check_in) >= now);
    const currentlyIn = reservations.find(
      (r: any) => parseISO(r.check_in) <= now && parseISO(r.check_out) > now,
    );
    const nights = inMonth.reduce((s: number, r: any) => s + (r.nights || 0), 0);
    const net = inMonth.reduce((s: number, r: any) => s + ownerNet(r), 0);
    return { inMonth, upcoming, currentlyIn, nights, net };
  }, [reservations, monthStart, monthEnd, now]);

  const byApt = apartments.map((a: any) => {
    const rs = stats.inMonth.filter((r: any) => r.apartment_id === a.id);
    return {
      ...a,
      count: rs.length,
      nights: rs.reduce((s: number, r: any) => s + (r.nights || 0), 0),
      net: rs.reduce((s: number, r: any) => s + ownerNet(r), 0),
    };
  });

  return (
    <>
      <TopBar
        title="Deptos MDQ"
        subtitle={format(now, "MMMM yyyy", { locale: es })}
      />
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <section className="grid grid-cols-2 gap-3">
          <StatCard icon={TrendingUp} label="Ingreso neto del mes" value={fmtARS(stats.net)} tone="primary" />
          <StatCard icon={Bed} label="Noches del mes" value={String(stats.nights)} tone="muted" />
          <StatCard icon={CalendarClock} label="Próximas reservas" value={String(stats.upcoming.length)} tone="muted" />
          <StatCard icon={Bed} label="Ocupado ahora" value={stats.currentlyIn ? "Sí" : "No"} tone={stats.currentlyIn ? "success" : "muted"} />
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Por departamento</h2>
          <div className="space-y-2">
            {byApt.map((a: any) => (
              <div key={a.id} className="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-card">
                <div className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white font-bold" style={{ backgroundColor: a.color }}>
                  {a.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.count} reservas · {a.nights} noches este mes</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{fmtARS(a.net)}</div>
                  <div className="text-[11px] text-muted-foreground">neto mes</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Próximas</h2>
          <div className="space-y-2">
            {stats.upcoming.slice(0, 5).map((r: any) => {
              const apt = apartments.find((a: any) => a.id === r.apartment_id);
              const days = differenceInCalendarDays(parseISO(r.check_in), now);
              return (
                <div key={r.id} className="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-card">
                  <div className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white text-xs font-bold" style={{ backgroundColor: apt?.color || "#888" }}>
                    {apt?.name?.[0] || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">{r.guest_name || "Sin nombre"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${platformColor[r.platform] || "bg-muted"}`}>{r.platform}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {format(parseISO(r.check_in), "d MMM", { locale: es })} → {format(parseISO(r.check_out), "d MMM", { locale: es })} · {r.nights} noches
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-primary">{days === 0 ? "Hoy" : days < 0 ? "En curso" : `en ${days}d`}</div>
                  </div>
                </div>
              );
            })}
            {stats.upcoming.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8 border rounded-2xl bg-muted/30">
                No hay reservas próximas. Tocá + para cargar una.
              </div>
            )}
          </div>
        </section>
      </main>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-elevated grid place-items-center hover:scale-105 transition"
        aria-label="Nueva reserva"
      >
        <Plus className="h-6 w-6" />
      </button>

      {open && (
        <ReservationForm
          apartments={apartments}
          onClose={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      )}
    </>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "muted" | "success" }) {
  const bg = tone === "primary" ? "gradient-primary text-primary-foreground" : tone === "success" ? "bg-success text-success-foreground" : "bg-card border";
  return (
    <div className={`rounded-2xl p-4 shadow-card ${bg}`}>
      <Icon className="h-4 w-4 opacity-80" />
      <div className="mt-3 text-xl font-bold leading-tight">{value}</div>
      <div className={`text-[11px] mt-1 opacity-80`}>{label}</div>
    </div>
  );
}
