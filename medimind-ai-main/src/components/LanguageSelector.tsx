import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center ${
            compact ? "gap-1.5 text-xs px-2 py-1" : "gap-2 text-xs px-3 py-2"
          } rounded-lg border border-border/60 bg-white/[0.02] hover:bg-white/[0.05] transition w-full justify-between`}
        >
          <span className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-medical-glow" />
            <span className="text-base leading-none">{current.flag}</span>
            <span className="text-foreground/90">{current.label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-48">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLanguage(l.code as Lang)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-base">{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {l.code === language && <Check className="h-3.5 w-3.5 text-medical-glow" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
