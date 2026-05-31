import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { useRoleTheme } from "@/hooks/useRoleTheme";
import { useT } from "@/hooks/useT";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const t = useT();
  const theme = useRoleTheme();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const userRole = useAppStore((s) => s.userRole);
  const voiceEnabled = useAppStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useAppStore((s) => s.setVoiceEnabled);
  const autoPlay = useAppStore((s) => s.autoPlay);
  const setAutoPlay = useAppStore((s) => s.setAutoPlay);

  const isAdmin = userRole === "admin";
  const isPro   = userRole === "professional";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("settings")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez votre expérience CerviScan AI.
          </p>
        </div>

        {/* Language — all roles */}
        <Section title="Langue" desc="Langue de l'interface et de la reconnaissance vocale.">
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code as Lang)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition ${
                  language === l.code
                    ? `${theme.border} ${theme.bg}`
                    : "border-border/60 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Audio — all roles */}
        <Section title="Audio" desc="Synthèse vocale et reconnaissance.">
          <Toggle label="Activer la synthèse vocale" checked={voiceEnabled} onChange={setVoiceEnabled} />
          <Toggle label="Lecture automatique des réponses" checked={autoPlay} onChange={setAutoPlay} />
        </Section>

        {/* Model info — professional + admin only */}
        {(isPro || isAdmin) && (
          <Section title="Modèle IA" desc="Modèle de langage utilisé pour la génération des réponses.">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-white/[0.02] text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-medium">Gemma 4</span>
              <span className="text-muted-foreground">via Ollama · local</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Assurez-vous qu'Ollama tourne avec{" "}
              <code className="text-[11px] px-1 py-0.5 rounded bg-white/[0.06]">ollama run gemma4</code>
            </p>
          </Section>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => toast.success("Paramètres enregistrés")}
            className={`px-4 py-2 rounded-xl bg-gradient-to-br ${theme.gradient} text-primary-foreground text-sm font-medium shadow-elegant hover:brightness-110 transition`}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-sm text-foreground/90">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
