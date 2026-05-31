import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useRoleTheme } from "@/hooks/useRoleTheme";
import { useT } from "@/hooks/useT";
import { updateMe } from "@/services/ragService";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const t = useT();
  const theme = useRoleTheme();
  const user = useAppStore((s) => s.user);
  const userRole = useAppStore((s) => s.userRole);
  const setAuth = useAppStore((s) => s.setAuth);
  const token = useAppStore((s) => s.token)!;
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const isPatient = userRole === "patient";

  const [nom, setNom] = useState(user?.nom ?? "");
  const [prenom, setPrenom] = useState(user?.prenom ?? "");
  const [age, setAge] = useState(String(user?.age ?? ""));
  const [region, setRegion] = useState(user?.region ?? "");
  const [specialite, setSpecialite] = useState(user?.specialite ?? "");
  const [etablissement, setEtablissement] = useState(user?.etablissement ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await updateMe({
        nom: nom || undefined,
        prenom: prenom || undefined,
        age: isPatient && age ? Number(age) : undefined,
        region: isPatient && region ? region : undefined,
        specialite: !isPatient && specialite ? specialite : undefined,
        etablissement: !isPatient && etablissement ? etablissement : undefined,
      });
      setAuth(token, updated);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <h1 className="text-xl font-semibold">{t("profile")}</h1>
        <p className="text-xs text-muted-foreground -mt-4">{user?.email}</p>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Identity */}
          <Section title="Identité">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" value={prenom} onChange={setPrenom} placeholder="Amina" />
              <Field label="Nom" value={nom} onChange={setNom} placeholder="Moussa" />
            </div>
          </Section>

          {/* Patient-specific */}
          {isPatient && (
            <Section title="Informations médicales">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Âge" type="number" value={age} onChange={setAge} placeholder="32" min="1" max="120" />
                <Field label="Région" value={region} onChange={setRegion} placeholder="Niamey" />
              </div>
            </Section>
          )}

          {/* Professional-specific */}
          {userRole === "professional" && (
            <Section title="Informations professionnelles">
              <Field label="Spécialité" value={specialite} onChange={setSpecialite} placeholder="Gynécologie-obstétrique" />
              <Field label="Établissement" value={etablissement} onChange={setEtablissement} placeholder="CHU de Niamey" />
            </Section>
          )}

          {/* Language */}
          <Section title="Langue de l'interface">
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
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

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br ${theme.gradient} text-white text-sm font-medium shadow-elegant hover:brightness-110 transition disabled:opacity-60`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3 shadow-soft">
      <div className="text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder = "", min, max,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; min?: string; max?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full bg-white/[0.04] border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-medical/50 transition"
      />
    </div>
  );
}
