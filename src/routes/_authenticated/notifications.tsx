import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Avisos · Deptos MDQ" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*, apartments(name, color), reservations(guest_name, check_in, check_out)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const markRead = async (n: any) => {
    if (!uid || (n.read_by || []).includes(uid)) return;
    await supabase
      .from("notifications")
      .update({ read_by: [...(n.read_by || []), uid] })
      .eq("id", n.id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAll = async () => {
    if (!uid) return;
    const unread = data.filter((n: any) => !(n.read_by || []).includes(uid));
    for (const n of unread) {
      await supabase.from("notifications").update({ read_by: [...(n.read_by || []), uid] }).eq("id", n.id);
    }
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const unreadCount = uid ? data.filter((n: any) => !(n.read_by || []).includes(uid)).length : 0;

  return (
    <>
      <TopBar
        title="Avisos"
        subtitle={unreadCount ? `${unreadCount} sin leer` : "Todo al día"}
        right={
          unreadCount > 0 && (
            <button onClick={markAll} className="text-xs font-semibold text-primary flex items-center gap-1 px-2 py-1 rounded-full hover:bg-primary/10">
              <CheckCheck className="h-4 w-4" /> Marcar
            </button>
          )
        }
      />
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {data.map((n: any) => {
          const read = uid ? (n.read_by || []).includes(uid) : false;
          return (
            <button
              key={n.id}
              onClick={() => markRead(n)}
              className={`w-full text-left border rounded-2xl p-4 flex items-start gap-3 transition ${read ? "bg-card" : "bg-primary/5 border-primary/20"}`}
            >
              <div className="h-9 w-9 shrink-0 rounded-full grid place-items-center" style={{ backgroundColor: n.apartments?.color || "var(--primary)" }}>
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">{n.title}</div>
                {n.message && <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">
                  {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: es })}
                </div>
              </div>
              {!read && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
              {read && <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
            </button>
          );
        })}
        {data.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 border rounded-2xl bg-muted/30">
            No hay avisos aún. Cuando se cargue o sincronice una reserva vas a verla acá.
          </div>
        )}
      </main>
    </>
  );
}
