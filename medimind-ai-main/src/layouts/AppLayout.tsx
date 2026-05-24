import { Outlet, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { ModelSelector } from "@/components/ModelSelector";
import { LanguageSelector } from "@/components/LanguageSelector";

const TITLES: Record<string, string> = {
  "/": "Chat",
  "/documents": "Documents",
  "/analytics": "Analytics",
  "/settings": "Paramètres",
};

export function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES[pathname] ?? "MediRAG";

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-border/50 glass">
          <div className="text-sm font-medium text-foreground/90">{title}</div>
          <div className="flex-1" />
          <div className="hidden sm:block">
            <ModelSelector />
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
