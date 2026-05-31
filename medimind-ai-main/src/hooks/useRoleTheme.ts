import { useAppStore } from "@/store/useAppStore";

/**
 * Returns Tailwind class strings for the current user role.
 * Patient  → rose-500 / pink-600 palette
 * Professional → medical / violet-soft palette (app default)
 */
export function useRoleTheme() {
  const userRole = useAppStore((s) => s.userRole);
  const isPatient = userRole === "patient";

  return {
    gradient:    isPatient ? "from-rose-500 to-pink-600"   : "from-medical to-violet-soft",
    gradientBg:  isPatient ? "bg-gradient-to-br from-rose-500 to-pink-600" : "bg-gradient-to-br from-medical to-violet-soft",
    glow:        isPatient ? "text-rose-400"               : "text-medical-glow",
    border:      isPatient ? "border-rose-500/40"          : "border-medical/40",
    borderHover: isPatient ? "hover:border-rose-500/40"    : "hover:border-medical/40",
    bg:          isPatient ? "bg-rose-500/10"              : "bg-medical/10",
    bgHover:     isPatient ? "hover:bg-rose-500/5"         : "hover:bg-medical/5",
    ring:        isPatient ? "ring-rose-500/40"            : "ring-medical/40",
    text:        isPatient ? "text-rose-500"               : "text-medical",
    pulse:       isPatient ? "bg-rose-400"                 : "bg-emerald-400",
    isPatient,
  };
}
