import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, RefreshCw, Trash2, Plus, Loader2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useServerFn } from "@tanstack/react-start";
import { syncIcalSource } from "@/lib/sync.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Ajustes · Deptos MDQ" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const sync = useServerFn(syncIcalSource);
  const [profile, setProfile] = useState<{ display_name: string }>({ display_name: "" });
  const [email, setEmail] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: apartments = [] } = useQuery({
    queryKey: ["apartments"],
    queryFn: async () => (await supabase.from("apartments").select("*").order("name")).data || [],
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["ical_sources"],
    queryFn: async () => (await supabase.from("ical_sources").select("*").order("created_at")).data || [],
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email || "");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (p) setProfile({ display_name: p.display_name || "" });
    })();
  }, []);

  const saveProfile = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, display_name: profile.display_name });
    if (error) return toast.error(error.message);
    toast.success("Perfil guardado");
  };

  const [newSrc, setNewSrc] = useState({ apartment_id: "", platform: "booking", label: "", url: "" });
  const addSource = async () => {
    if (!newSrc.apartment_id || !newSrc.url) return toast.error("Depto y URL requeridos");
    const { error } = await supabase.from("ical_sources").insert(newSrc);
    if (error) return toast.error(error.message);
    setNewSrc({ apartment_id: "", platform: "booking", label: "", url: "" });
    qc.invalidateQueries({ queryKey: ["ical_sources"] });
    toast.success("Calendario agregado");
  };

  const deleteSource = async (id: string) => {
    if (!confirm("¿Eliminar este calendario?")) return;
    await supabase.from("ical_sources").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ical_sources"] });
  };

  const runSync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await sync({ data: { sourceId: id } });
      toast.success(`Sync OK · ${res.inserted} nuevas · ${res.updated} act.`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de sync");
    } finally {
      setSyncing(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <TopBar title="Ajustes" />
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        <Section title="Tu cuenta">
          <div className="text-xs text-muted-foreground mb-2">{email}</div>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Nombre para mostrar</span>
            <input
              value={profile.display_name}
              onChange={(e) => setProfile({ display_name: e.target.value })}
              className="mt-1 w-full rounded-xl border px-4 py-2.5"
            />
          </label>
          <button onClick={saveProfile} className="mt-3 rounded-full gradient-primary text-primary-foreground px-5 py-2 font-semibold">
            Guardar
          </button>
        </Section>

        <Section title="Sincronización iCal (Booking / Airbnb)">
          <p className="text-xs text-muted-foreground mb-3">
            Pegá la URL de exportación de calendario iCal desde Booking o Airbnb. La app trae las reservas automáticamente. Podés cargar las dos plataformas para cada depto.
          </p>

          <div className="space-y-2">
            {sources.map((s: any) => {
              const a = apartments.find((x: any) => x.id === s.apartment_id);
              return (
                <div key={s.id} className="border rounded-2xl p-3 bg-card">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a?.color }} />
                    <span className="font-semibold text-sm">{a?.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted uppercase font-bold">{s.platform}</span>
                    {s.label && <span className="text-xs text-muted-foreground">{s.label}</span>}
                    <button onClick={() => deleteSource(s.id)} className="ml-auto p-1.5 rounded-full hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-1">{s.url}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => runSync(s.id)}
                      disabled={syncing === s.id}
                      className="text-xs font-semibold flex items-center gap-1 rounded-full border px-3 py-1 hover:bg-accent"
                    >
                      {syncing === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Sincronizar
                    </button>
                    {s.last_synced_at && (
                      <span className="text-[11px] text-muted-foreground">
                        {s.last_sync_status === "error" ? "❌ " : "✓ "}
                        hace {formatDistanceToNow(parseISO(s.last_synced_at), { locale: es })}
                      </span>
                    )}
                  </div>
                  {s.last_sync_message && (
                    <div className="text-[11px] text-muted-foreground mt-1">{s.last_sync_message}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t pt-4 space-y-2">
            <div className="text-sm font-semibold">Agregar calendario</div>
            <div className="grid grid-cols-2 gap-2">
              <select value={newSrc.apartment_id} onChange={(e) => setNewSrc({ ...newSrc, apartment_id: e.target.value })} className="rounded-xl border px-3 py-2.5 text-sm">
                <option value="">Depto...</option>
                {apartments.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={newSrc.platform} onChange={(e) => setNewSrc({ ...newSrc, platform: e.target.value })} className="rounded-xl border px-3 py-2.5 text-sm">
                <option value="booking">Booking</option>
                <option value="airbnb">Airbnb</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <input
              value={newSrc.url}
              onChange={(e) => setNewSrc({ ...newSrc, url: e.target.value })}
              placeholder="https://... .ics"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            />
            <input
              value={newSrc.label}
              onChange={(e) => setNewSrc({ ...newSrc, label: e.target.value })}
              placeholder="Etiqueta (opcional)"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            />
            <button onClick={addSource} className="rounded-full gradient-primary text-primary-foreground px-5 py-2 font-semibold flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4" /> Agregar
            </button>
          </div>

          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold">¿Dónde encuentro la URL iCal?</summary>
            <div className="mt-2 space-y-2 pl-2">
              <p><strong>Booking:</strong> Extranet → Tarifas y Disponibilidad → Sincronización de Calendarios → Exportar calendario.</p>
              <p><strong>Airbnb:</strong> Calendario del anuncio → Disponibilidad → Sincronizar calendarios → Exportar calendario.</p>
              <p>Copiá la URL y pegala arriba. La sincro es cada vez que apretás el botón (podemos automatizarla si querés).</p>
            </div>
          </details>
        </Section>

        <Section title="Departamentos">
          <div className="space-y-2">
            {apartments.map((a: any) => (
              <div key={a.id} className="border rounded-2xl p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl grid place-items-center text-white font-bold" style={{ backgroundColor: a.color }}>{a.name[0]}</div>
                <div className="flex-1">
                  <div className="font-semibold">{a.name}</div>
                  {a.notes && <div className="text-xs text-muted-foreground">{a.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <button onClick={signOut} className="w-full rounded-full border border-destructive text-destructive px-5 py-3 font-semibold flex items-center justify-center gap-2 hover:bg-destructive/10">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{title}</h2>
      <div className="bg-card border rounded-2xl p-4 shadow-card">{children}</div>
    </section>
  );
}
