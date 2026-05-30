import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const model = useAppStore((s) => s.model);
  const setModel = useAppStore((s) => s.setModel);

  const voiceEnabled = useAppStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useAppStore((s) => s.setVoiceEnabled);
  const autoPlay = useAppStore((s) => s.autoPlay);
  const setAutoPlay = useAppStore((s) => s.setAutoPlay);

  const [autoLang, setAutoLang] = useState(true);
  const [translate, setTranslate] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez votre expérience MediRAG.
          </p>
        </div>

        <Section title="Modèle IA" desc="Choisissez le modèle utilisé pour les réponses.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                ["gemma-3-multimodal", "Gemma 3 Multimodal"],
                ["qwen-vl", "Qwen-VL"],
                ["llava-1.6", "LLaVA 1.6"],
                ["gpt-4o-vision", "GPT-4o Vision"],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                onClick={() => setModel(id)}
                className={`text-left p-3 rounded-xl border transition ${
                  model === id
                    ? "border-medical/60 bg-medical/10"
                    : "border-border/60 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{id}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Embeddings" desc="Modèle d'encodage vectoriel utilisé pour le RAG.">
          <select
            defaultValue="multilingual-e5-large"
            className="w-full bg-white/[0.03] border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:border-medical/60"
          >
            <option value="multilingual-e5-large">multilingual-e5-large</option>
            <option value="bge-m3">bge-m3</option>
            <option value="text-embedding-3-large">text-embedding-3-large</option>
          </select>
        </Section>

        <Section title="Langue de l'interface" desc="L'interface s'adapte à votre langue.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code as Lang)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition ${
                  language === l.code
                    ? "border-medical/60 bg-medical/10"
                    : "border-border/60 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Audio" desc="Synthèse vocale et reconnaissance.">
          <Toggle label="Activer la synthèse vocale" checked={voiceEnabled} onChange={setVoiceEnabled} />
          <Toggle label="Lecture automatique des réponses" checked={autoPlay} onChange={setAutoPlay} />
        </Section>

        <Section title="Traduction" desc="Détection et traduction automatiques.">
          <Toggle label="Détection automatique de la langue" checked={autoLang} onChange={setAutoLang} />
          <Toggle label="Traduire les sources en langue cible" checked={translate} onChange={setTranslate} />
        </Section>

        <div className="flex justify-end">
          <button
            onClick={() => toast.success("Paramètres enregistrés")}
            className="px-4 py-2 rounded-xl bg-gradient-to-br from-medical to-violet-soft text-primary-foreground text-sm font-medium shadow-elegant hover:brightness-110 transition"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3 shadow-soft">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-sm text-foreground/90">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
