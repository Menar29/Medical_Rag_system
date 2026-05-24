import { Check, ChevronDown, Cpu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore, type ModelId } from "@/store/useAppStore";

const MODELS: { id: ModelId; name: string; desc: string; badge?: string }[] = [
  { id: "gemma-3-multimodal", name: "Gemma 3 Multimodal", desc: "Texte + image, optimisé local", badge: "Recommandé" },
  { id: "qwen-vl", name: "Qwen-VL", desc: "Vision-language multilingue" },
  { id: "llava-1.6", name: "LLaVA 1.6", desc: "Open-source vision" },
  { id: "gpt-4o-vision", name: "GPT-4o Vision", desc: "Cloud, haute précision" },
];

export function ModelSelector() {
  const model = useAppStore((s) => s.model);
  const setModel = useAppStore((s) => s.setModel);
  const current = MODELS.find((m) => m.id === model) ?? MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/[0.02] hover:bg-white/[0.05] px-3 py-1.5 text-xs transition">
          <Cpu className="h-3.5 w-3.5 text-medical-glow" />
          <span className="text-foreground/90 font-medium">{current.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="glass-strong w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Modèles disponibles
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => setModel(m.id)}
            className="flex items-start gap-3 cursor-pointer py-2"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {m.name}
                {m.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-medical/20 text-medical-glow border border-medical/30">
                    {m.badge}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </div>
            {m.id === model && <Check className="h-4 w-4 text-medical-glow mt-1" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
