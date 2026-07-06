import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReservationForm } from "@/components/reservation-form";
import { platformColor } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendario · Deptos MDQ" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedApt, setSelectedApt] = useState<string | "all">("all");
  const [editing, setEditing] = useState<any | null>(null);

  const { data: apartments = [] } = useQuery({
    queryKey: ["apartments"],
    queryFn: async () => {
      const { data } = await supabase.from("apartments").select("*").order("name");
      return data || [];
    },
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", "calendar"],
    queryFn: async () => {
      const { data } = await supabase.from("reservations").select("*");
      return data || [];
    },
  });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const filtered = useMemo(
    () => reservations.filter((r: any) => selectedApt === "all" || r.apartment_id === selectedApt),
    [reservations, selectedApt],
  );

  const bookingsOn = (day: Date) =>
    filtered.filter((r: any) => {
      const ci = parseISO(r.check_in);
      const co = parseISO(r.check_out);
      return day >= new Date(ci.getFullYear(), ci.getMonth(), ci.getDate()) &&
             day < new Date(co.getFullYear(), co.getMonth(), co.getDate());
    });

  const today = new Date();

  const listForMonth = useMemo(
    () => filtered
      .filter((r: any) => {
        const ci = parseISO(r.check_in);
        return ci >= startOfMonth(month) && ci <= endOfMonth(month);
      })
      .sort((a: any, b: any) => a.check_in.localeCompare(b.check_in)),
    [filtered, month],
  );

  return (
    <>
      <TopBar title="Calendario" subtitle={format(month, "MMMM yyyy", { locale: es })} />
      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedApt("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${selectedApt === "all" ? "bg-foreground text-background" : "hover:bg-accent"}`}
          >Todos</button>
          {apartments.map((a: any) => (
            <button
              key={a.id}
              onClick={() => setSelectedApt(a.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border flex items-center gap-2 ${selectedApt === a.id ? "text-white" : "hover:bg-accent"}`}
              style={selectedApt === a.id ? { backgroundColor: a.color, borderColor: a.color } : {}}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
              {a.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth(addMonths(month, -1))} className="p-2 rounded-full hover:bg-accent">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setMonth(startOfMonth(new Date()))} className="text-sm font-semibold px-3 py-1 rounded-full hover:bg-accent">
            Hoy
          </button>
          <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-accent">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-[11px] font-semibold text-muted-foreground text-center mb-1">
          {["L","M","M","J","V","S","D"].map((d, i) => <div key={i}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, month);
            const bookings = bookingsOn(day);
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`aspect-square rounded-xl border p-1 flex flex-col text-[11px] ${inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"} ${isToday ? "ring-2 ring-primary" : ""}`}
              >
                <div className="text-right font-semibold">{format(day, "d")}</div>
                <div className="mt-auto space-y-0.5">
                  {bookings.slice(0, 2).map((b: any) => {
                    const apt = apartments.find((a: any) => a.id === b.apartment_id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => setEditing(b)}
                        className="w-full text-left px-1 rounded truncate text-white text-[9px] font-semibold"
                        style={{ backgroundColor: apt?.color || "#888" }}
                        title={`${b.guest_name || "Reserva"} · ${apt?.name}`}
                      >
                        {b.guest_name?.split(" ")[0] || apt?.name?.slice(0, 3)}
                      </button>
                    );
                  })}
                  {bookings.length > 2 && (
                    <div className="text-[9px] text-muted-foreground text-center">+{bookings.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Reservas de {format(month, "MMMM", { locale: es })}
          </h2>
          <div className="space-y-2">
            {listForMonth.map((r: any) => {
              const apt = apartments.find((a: any) => a.id === r.apartment_id);
              return (
                <button
                  key={r.id}
                  onClick={() => setEditing(r)}
                  className="w-full bg-card border rounded-2xl p-3 flex items-center gap-3 shadow-card hover:bg-accent/40 text-left"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg grid place-items-center text-white text-xs font-bold" style={{ backgroundColor: apt?.color }}>
                    {apt?.name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">{r.guest_name || "Sin nombre"}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${platformColor[r.platform] || "bg-muted"}`}>{r.platform}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {format(parseISO(r.check_in), "d MMM", { locale: es })} → {format(parseISO(r.check_out), "d MMM", { locale: es })} · {r.nights}n
                    </div>
                  </div>
                </button>
              );
            })}
            {listForMonth.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-6 border rounded-2xl bg-muted/30">
                No hay reservas este mes.
              </div>
            )}
          </div>
        </section>
      </main>

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
