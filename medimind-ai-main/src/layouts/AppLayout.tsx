import { useEffect } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { RoleSelector } from "@/components/RoleSelector";
import { AuthModal } from "@/components/AuthModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAppStore, type UserRole } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";
import { useRoleTheme } from "@/hooks/useRoleTheme";
import { setServiceToken } from "@/services/ragService";

// ── Access control map ─────────────────────────────────────────────────────────
const ALLOWED: Record<string, UserRole[]> = {
  "/":          ["patient", "professional", "admin"],
  "/profile":   ["patient", "professional", "admin"],
  "/settings":  ["patient", "professional", "admin"],
  "/documents": ["professional", "admin"],
  "/analytics": ["admin"],
  "/admin":     ["admin"],
};

const TITLE_KEYS: Record<string, string> = {
  "/":          "chat",
  "/documents": "documents",
  "/analytics": "analytics",
  "/settings":  "settings",
  "/profile":   "profile",
  "/admin":     "admin",
};

export function AppLayout() {
  const t = useT();
  const theme = useRoleTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const userRole = useAppStore((s) => s.userRole);
  const token    = useAppStore((s) => s.token);

  // Sync token to ragService on every change
  useEffect(() => { setServiceToken(token); }, [token]);

  // Route guard — redirect to "/" if role has no access to this path
  useEffect(() => {
    if (!userRole || !token) return;
    const allowed = ALLOWED[pathname];
    if (allowed && !allowed.includes(userRole)) {
      navigate({ to: "/" });
    }
  }, [pathname, userRole, token, navigate]);

  // 1 — No role → onboarding
  if (!userRole) return <RoleSelector />;

  // 2 — No token → auth
  if (!token) return <AuthModal />;

  const titleKey = TITLE_KEYS[pathname];
  const title = titleKey ? t(titleKey) : t("app_name");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-border/50 glass">
          <div className="text-sm font-medium text-foreground/90 capitalize">{title}</div>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/50 bg-white/[0.02] text-[11px] text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${theme.pulse}`} />
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
