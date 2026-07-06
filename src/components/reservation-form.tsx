import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { PLATFORMS } from "@/lib/finance";

type Apartment = { id: string; name: string; color: string };

type Props = {
  apartments: Apartment[];
  reservationId?: string;
  initial?: Partial<FormState>;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  apartment_id: string;
  platform: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  currency: string;
  amount_usd: string;
  amount_ars: string;
  exchange_rate: string;
  cleaning_fee_ars: string;
  booking_commission_usd: string;
  booking_commission_ars: string;
  admin_percentage: string;
  supplies_cost_ars: string;
  supplies_description: string;
  separated: boolean;
  status: string;
  notes: string;
};

const empty = (aptId: string): FormState => ({
  apartment_id: aptId,
  platform: "airbnb",
  guest_name: "",
  check_in: "",
  check_out: "",
  currency: "ARS",
  amount_usd: "",
  amount_ars: "",
  exchange_rate: "",
  cleaning_fee_ars: "17000",
  booking_commission_usd: "",
  booking_commission_ars: "",
  admin_percentage: "20",
  supplies_cost_ars: "",
  supplies_description: "",
  separated: false,
  status: "confirmed",
  notes: "",
});

export function ReservationForm({ apartments, reservationId, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    ...empty(apartments[0]?.id || ""),
    ...(initial as FormState),
  });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.apartment_id || !form.check_in || !form.check_out) {
      toast.error("Falta depto o fechas");
      return;
    }
    setBusy(true);
    const payload = {
      apartment_id: form.apartment_id,
      platform: form.platform,
      guest_name: form.guest_name || null,
      check_in: form.check_in,
      check_out: form.check_out,
      currency: form.currency,
      amount_usd: num(form.amount_usd),
      amount_ars: num(form.amount_ars),
      exchange_rate: num(form.exchange_rate),
      cleaning_fee_ars: num(form.cleaning_fee_ars),
      booking_commission_usd: num(form.booking_commission_usd),
      booking_commission_ars: num(form.booking_commission_ars),
      admin_percentage: num(form.admin_percentage),
      supplies_cost_ars: num(form.supplies_cost_ars),
      supplies_description: form.supplies_description || null,
      separated: form.separated,
      status: form.status,
      notes: form.notes || null,
    };

    let error;
    if (reservationId) {
      ({ error } = await supabase.from("reservations").update(payload).eq("id", reservationId));
    } else {
      const { data: u } = await supabase.auth.getUser();
      ({ error } = await supabase
        .from("reservations")
        .insert({ ...payload, source: "manual", created_by: u.user?.id }));
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(reservationId ? "Reserva actualizada" : "Reserva creada");
    onSaved();
  };

  const del = async () => {
    if (!reservationId) return;
    if (!confirm("¿Eliminar esta reserva?")) return;
    const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
    if (error) return toast.error(error.message);
    toast.success("Reserva eliminada");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92dvh] overflow-y-auto shadow-elevated">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">
            {reservationId ? "Editar reserva" : "Nueva reserva"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <Grid>
            <Field label="Depto">
              <select
                value={form.apartment_id}
                onChange={(e) => set("apartment_id", e.target.value)}
                className="input"
              >
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Plataforma">
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
                className="input"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
          </Grid>

          <Field label="Huésped">
            <input
              value={form.guest_name}
              onChange={(e) => set("guest_name", e.target.value)}
              className="input"
              placeholder="Nombre"
            />
          </Field>

          <Grid>
            <Field label="Check-in">
              <input type="date" required value={form.check_in} onChange={(e) => set("check_in", e.target.value)} className="input" />
            </Field>
            <Field label="Check-out">
              <input type="date" required value={form.check_out} onChange={(e) => set("check_out", e.target.value)} className="input" />
            </Field>
          </Grid>

          <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cobro</h3>
            <Grid>
              <Field label="Moneda">
                <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className="input">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
              <Field label="Cotización USD">
                <input inputMode="decimal" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} className="input" placeholder="1450" />
              </Field>
            </Grid>
            <Grid>
              <Field label="Monto USD">
                <input inputMode="decimal" value={form.amount_usd} onChange={(e) => set("amount_usd", e.target.value)} className="input" />
              </Field>
              <Field label="Monto ARS">
                <input inputMode="decimal" value={form.amount_ars} onChange={(e) => set("amount_ars", e.target.value)} className="input" />
              </Field>
            </Grid>
          </div>

          <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Descuentos</h3>
            <Grid>
              <Field label="Limpieza ARS">
                <input inputMode="decimal" value={form.cleaning_fee_ars} onChange={(e) => set("cleaning_fee_ars", e.target.value)} className="input" />
              </Field>
              <Field label="Adm %">
                <input inputMode="decimal" value={form.admin_percentage} onChange={(e) => set("admin_percentage", e.target.value)} className="input" />
              </Field>
            </Grid>
            <Grid>
              <Field label="Com. Booking USD">
                <input inputMode="decimal" value={form.booking_commission_usd} onChange={(e) => set("booking_commission_usd", e.target.value)} className="input" />
              </Field>
              <Field label="Com. Booking ARS">
                <input inputMode="decimal" value={form.booking_commission_ars} onChange={(e) => set("booking_commission_ars", e.target.value)} className="input" />
              </Field>
            </Grid>
            <Grid>
              <Field label="Art. limpieza ARS">
                <input inputMode="decimal" value={form.supplies_cost_ars} onChange={(e) => set("supplies_cost_ars", e.target.value)} className="input" />
              </Field>
              <Field label="Descripción art.">
                <input value={form.supplies_description} onChange={(e) => set("supplies_description", e.target.value)} className="input" placeholder="Papel, lavandina..." />
              </Field>
            </Grid>
          </div>

          <Field label="Notas">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input min-h-[80px]" />
          </Field>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.separated} onChange={(e) => set("separated", e.target.checked)} className="h-4 w-4 accent-[color:var(--primary)]" />
            Ya separé la parte del propietario
          </label>

          <div className="flex gap-2 pt-2">
            {reservationId && (
              <button type="button" onClick={del} className="rounded-full border border-destructive text-destructive px-5 py-3 font-semibold hover:bg-destructive/10">
                Eliminar
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-full border px-5 py-3 font-semibold hover:bg-accent ml-auto">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="rounded-full gradient-primary text-primary-foreground px-6 py-3 font-semibold flex items-center gap-2 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border-radius:12px;border:1px solid var(--border);padding:.7rem .9rem;background:var(--background);outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
