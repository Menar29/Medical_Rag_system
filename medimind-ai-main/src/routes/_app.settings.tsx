import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { HeartPulse, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/hooks/useT";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const userRole = useAppStore((s) => s.userRole);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const voiceEnabled = useAppStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useAppStore((s) => s.setVoiceEnabled);
  const autoPlay = useAppStore((s) => s.autoPlay);
  const setAutoPlay = useAppStore((s) => s.setAutoPlay);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("settings")}</h1>
          <p className="text-sm text-muted-foreground mt-1">Personnalisez votre expérience CerviScan AI.</p>
        </div>

        {/* Profile / Role */}
        <Section title="Profil" desc="Choisissez votre profil pour adapter les réponses et l'interface.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(["patient", "professional"] as const).map((role) => {
              const Icon = role === "patient" ? HeartPulse : Stethoscope;
              const gradient = role === "patient" ? "border-rose-500/60 bg-rose-500/10" : "border-medical/60 bg-medical/10";
              const isActive = userRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${isActive ? gradient : "border-border/60 bg-white/[0.02] hover:bg-white/[0.04]"}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? (role === "patient" ? "text-rose-400" : "text-medical-glow") : "text-muted-foreground"}`} />
                  <div>
                    <div className="text-sm font-medium">{t(`role_${role}`)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t(`role_${role}_desc`)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Language */}
        <Section title={t("settings") + " · Langue"} desc="La langue de l'interface et de la détection vocale.">
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code as Lang)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition ${language === l.code ? "border-medical/60 bg-medical/10" : "border-border/60 bg-white/[0.02] hover:bg-white/[0.04]"}`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Audio */}
        <Section title="Audio" desc="Synthèse vocale et reconnaissance.">
          <Toggle label="Activer la synthèse vocale" checked={voiceEnabled} onChange={setVoiceEnabled} />
          <Toggle label="Lecture automatique des réponses" checked={autoPlay} onChange={setAutoPlay} />
        </Section>

        {/* Model info */}
        <Section title="Modèle IA" desc="Modèle de langage utilisé pour la génération des réponses.">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-white/[0.02] text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-medium">Gemma 4</span>
            <span className="text-muted-foreground">via Ollama · local</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Assurez-vous qu'Ollama tourne avec <code className="text-[11px] px-1 py-0.5 rounded bg-white/[0.06]">ollama run gemma4</code>
          </p>
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
