import { Outlet, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { RoleSelector } from "@/components/RoleSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";

const TITLES: Record<string, string> = {
  "/": "chat",
  "/documents": "documents",
  "/analytics": "analytics",
  "/settings": "settings",
};

export function AppLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const userRole = useAppStore((s) => s.userRole);
  const titleKey = TITLES[pathname];
  const title = titleKey ? t(titleKey) : t("app_name");

  if (!userRole) return <RoleSelector />;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-border/50 glass">
          <div className="text-sm font-medium text-foreground/90 capitalize">{title}</div>
          <div className="flex-1" />
          {/* Gemma 4 label */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/50 bg-white/[0.02] text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Gemma 4 · Ollama
          </div>
          <div className="w-44">
            <LanguageSelector compact />
          </div>
        </header>
        <main className="flex-1 min-h-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
