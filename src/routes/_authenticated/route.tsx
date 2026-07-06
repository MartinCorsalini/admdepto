import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Home, LayoutGrid, Settings, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-dvh bg-background pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const queryClient = useQueryClient();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let userId: string | null = null;

    (async () => {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      await refresh(userId);
    })();

    const channel = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          refresh(userId);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .subscribe();

    async function refresh(uid: string | null) {
      const { data } = await supabase
        .from("notifications")
        .select("id, read_by")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!data) return;
      const count = data.filter(
        (n) => !uid || !(n.read_by || []).includes(uid),
      ).length;
      setUnread(count);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const items = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/calendar", label: "Calendario", icon: CalendarDays },
    { to: "/reservations", label: "Reservas", icon: LayoutGrid },
    { to: "/notifications", label: "Avisos", icon: Bell, badge: unread },
    { to: "/settings", label: "Ajustes", icon: Settings },
  ] as const;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-5 max-w-2xl mx-auto">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {"badge" in it && it.badge ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                    {it.badge > 9 ? "9+" : it.badge}
                  </span>
                ) : null}
              </div>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
