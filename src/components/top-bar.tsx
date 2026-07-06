import { Link } from "@tanstack/react-router";
import { Bell, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function TopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let uid: string | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
      const { data: n } = await supabase.from("notifications").select("id, read_by").limit(50);
      if (n) setUnread(n.filter((x) => !uid || !(x.read_by || []).includes(uid)).length);
    })();
    const ch = supabase
      .channel("topbar-notif")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async () => {
        const { data: n } = await supabase.from("notifications").select("id, read_by").limit(50);
        if (n) setUnread(n.filter((x) => !uid || !(x.read_by || []).includes(uid)).length);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
      <div className="max-w-2xl mx-auto px-4 py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-card">
          <Home className="h-4 w-4" strokeWidth={2.5} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <Link to="/notifications" className="relative p-2 rounded-full hover:bg-accent">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
