import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, FileText, HeartPulse, LogOut, MessageSquarePlus,
  Settings as SettingsIcon, Sparkles, Stethoscope, Trash2, UserCog,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";
import { useRoleTheme } from "@/hooks/useRoleTheme";
import { setServiceToken } from "@/services/ragService";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/LanguageSelector";

const navItems = (t: (k: string) => string) => [
  { to: "/",          label: t("chat"),      icon: Sparkles    },
  { to: "/documents", label: t("documents"), icon: FileText    },
  { to: "/analytics", label: t("analytics"), icon: BarChart3   },
  { to: "/settings",  label: t("settings"),  icon: SettingsIcon},
];

export function Sidebar() {
  const t = useT();
  const theme = useRoleTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const conversations = useAppStore((s) => s.conversations);
  const activeId = useAppStore((s) => s.activeId);
  const userRole = useAppStore((s) => s.userRole);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const newConversation = useAppStore((s) => s.newConversation);
  const setActive = useAppStore((s) => s.setActive);
  const deleteConversation = useAppStore((s) => s.deleteConversation);

  const isPatient = userRole === "patient";
  const RoleIcon = isPatient ? HeartPulse : Stethoscope;
  const roleLabel = t(isPatient ? "role_badge_patient" : "role_badge_professional");
  const displayName = user ? `${user.prenom ?? ""} ${user.nom ?? ""}`.trim() || user.email : roleLabel;

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-border/60 bg-sidebar/70 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/50">
        <div className="relative">
          <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${theme.gradient} grid place-items-center shadow-elegant`}>
            <Stethoscope className="h-[1.1rem] w-[1.1rem] text-white" strokeWidth={2.4} />
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${theme.pulse} ring-2 ring-sidebar animate-pulse`} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">{t("app_name")}</div>
          <div className="text-[11px] text-muted-foreground">{t("app_tagline")}</div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-3 pt-3">
        <button
          onClick={() => setUserRole(isPatient ? "professional" : "patient")}
          title={t("role_change")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/50 bg-white/[0.02] hover:bg-white/[0.04] transition group"
        >
          <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${theme.gradient} grid place-items-center`}>
            <RoleIcon className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
          </div>
          <span className="text-xs text-foreground/85 font-medium flex-1 text-left truncate">{displayName}</span>
          <UserCog className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition" />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 pt-2 pb-1">
        <Link
          to="/"
          onClick={() => newConversation()}
          className="group flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-gradient-to-b from-white/[0.04] to-transparent px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:bg-white/[0.04] transition shadow-soft"
        >
          <span className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-medical-glow" />
            {t("new_chat")}
          </span>
          <kbd className="hidden lg:inline text-[10px] text-muted-foreground border border-border/70 rounded px-1.5 py-0.5">⌘N</kbd>
        </Link>
      </div>

      {/* Nav */}
      <nav className="px-2 pb-2">
        {navItems(t).map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition relative",
                active ? "text-foreground bg-white/[0.05]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-gradient-to-b ${theme.gradient}`}
                />
              )}
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* History */}
      <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground/80">{t("history")}</div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        <AnimatePresence initial={false}>
          {conversations.length === 0 && (
            <div className="px-3 py-6 text-xs text-muted-foreground/70 italic">—</div>
          )}
          {conversations.map((c) => {
            const active = c.id === activeId && pathname === "/";
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition",
                  active ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                )}
                onClick={() => setActive(c.id)}
              >
                <span className="truncate flex-1">{c.title || "—"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-destructive/20 hover:text-destructive"
                  aria-label="delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("api_status")}</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t("online")}
          </span>
        </div>
        <LanguageSelector />
        <button
          onClick={() => { setServiceToken(null); logout(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
