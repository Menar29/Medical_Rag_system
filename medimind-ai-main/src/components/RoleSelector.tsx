import { motion } from "framer-motion";
import { HeartPulse, Mic, Shield, Stethoscope } from "lucide-react";
import { useAppStore, type UserRole } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";
import { LanguageSelector } from "./LanguageSelector";

const ROLES: { id: UserRole; icon: React.ElementType; gradient: string; hover: string }[] = [
  {
    id: "patient",
    icon: HeartPulse,
    gradient: "from-rose-500 to-pink-600",
    hover: "hover:border-rose-500/50 hover:bg-rose-500/5",
  },
  {
    id: "professional",
    icon: Stethoscope,
    gradient: "from-medical to-violet-soft",
    hover: "hover:border-medical/50 hover:bg-medical/5",
  },
  {
    id: "admin",
    icon: Shield,
    gradient: "from-amber-500 to-orange-500",
    hover: "hover:border-amber-500/50 hover:bg-amber-500/5",
  },
];

export function RoleSelector() {
  const t = useT();
  const setUserRole = useAppStore((s) => s.setUserRole);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4"
      style={{
        backgroundImage:
          "radial-gradient(900px circle at 20% -10%, oklch(0.7 0.16 245 / 12%), transparent 50%), radial-gradient(700px circle at 80% 100%, oklch(0.68 0.18 295 / 10%), transparent 50%)",
      }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-10"
      >
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-medical to-violet-soft grid place-items-center shadow-elegant mb-4">
          <Stethoscope className="h-8 w-8 text-white" strokeWidth={2.2} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">{t("app_name")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("app_tagline")}</p>
        <div className="mt-1 text-[11px] text-muted-foreground/60 uppercase tracking-widest">
          Niger · Likita Care
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <h2 className="text-xl font-semibold">{t("role_select_title")}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{t("role_select_sub")}</p>
      </motion.div>

      {/* Role cards — 2 col on sm, then 3rd full-width or 3-col on lg */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.3 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-2xl"
      >
        {ROLES.map((role) => (
          <motion.button
            key={role.id}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setUserRole(role.id)}
            className={`group flex flex-col items-start gap-4 p-5 rounded-2xl border border-border/60 bg-white/[0.02] transition-all shadow-soft text-left ${role.hover}`}
          >
            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${role.gradient} grid place-items-center shadow-elegant`}>
              <role.icon className="h-5.5 w-5.5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-base font-semibold">{t(`role_${role.id}`)}</div>
              <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t(`role_${role.id}_desc`)}
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground/60"
      >
        <Mic className="h-3 w-3" />
        <span>Support vocal FR · Hausa</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-4 w-48"
      >
        <LanguageSelector />
      </motion.div>
    </div>
  );
}
