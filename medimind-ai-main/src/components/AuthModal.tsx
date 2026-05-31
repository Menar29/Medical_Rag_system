import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, HeartPulse, Loader2, Stethoscope } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";
import { useRoleTheme } from "@/hooks/useRoleTheme";
import { login, register, setServiceToken } from "@/services/ragService";
import { LanguageSelector } from "./LanguageSelector";

export function AuthModal() {
  const t = useT();
  const userRole = useAppStore((s) => s.userRole);
  const setAuth = useAppStore((s) => s.setAuth);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const theme = useRoleTheme();

  const [tab, setTab] = useState<"login" | "register">("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [etablissement, setEtablissement] = useState("");

  const isPatient = userRole === "patient";
  const Icon = isPatient ? HeartPulse : Stethoscope;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let result;
      if (tab === "login") {
        result = await login(email, password);
      } else {
        result = await register({
          email,
          password,
          role: userRole ?? "patient",
          nom: nom || undefined,
          prenom: prenom || undefined,
          age: isPatient && age ? Number(age) : undefined,
          region: isPatient && region ? region : undefined,
          specialite: !isPatient && specialite ? specialite : undefined,
          etablissement: !isPatient && etablissement ? etablissement : undefined,
        });
      }
      setServiceToken(result.access_token);
      setAuth(result.access_token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 overflow-y-auto py-8"
      style={{
        backgroundImage:
          "radial-gradient(900px circle at 20% -10%, oklch(0.7 0.16 245 / 10%), transparent 50%), radial-gradient(700px circle at 80% 100%, oklch(0.68 0.18 295 / 8%), transparent 50%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-7">
          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${theme.gradient} grid place-items-center shadow-elegant mb-3`}>
            <Icon className="h-7 w-7 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight gradient-text">CerviScan AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPatient ? t("role_patient") : t("role_professional")}
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-elegant">
          {/* Tabs */}
          <div className="flex rounded-xl border border-border/50 p-0.5 mb-6 bg-white/[0.02]">
            {(["register", "login"] as const).map((t_) => (
              <button
                key={t_}
                onClick={() => { setTab(t_); setError(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                  tab === t_
                    ? `bg-gradient-to-br ${theme.gradient} text-white shadow-sm`
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t_ === "register" ? "S'inscrire" : "Se connecter"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" required />

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-white/[0.04] border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Register-only fields */}
            <AnimatePresence>
              {tab === "register" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Prénom" value={prenom} onChange={setPrenom} placeholder="Amina" />
                    <Field label="Nom" value={nom} onChange={setNom} placeholder="Moussa" />
                  </div>

                  {isPatient ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Âge" type="number" value={age} onChange={setAge} placeholder="32" min="1" max="120" />
                      <Field label="Région" value={region} onChange={setRegion} placeholder="Niamey" />
                    </div>
                  ) : (
                    <>
                      <Field label="Spécialité" value={specialite} onChange={setSpecialite} placeholder="Gynécologie-obstétrique" />
                      <Field label="Établissement" value={etablissement} onChange={setEtablissement} placeholder="CHU de Niamey" />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-xl bg-gradient-to-br ${theme.gradient} text-white font-medium text-sm shadow-elegant hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {tab === "register" ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>
        </div>

        {/* Back + language */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setUserRole(null as unknown as "patient")}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            ← {t("role_change")}
          </button>
          <div className="w-36">
            <LanguageSelector compact />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder = "", required, min, max,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; min?: string; max?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className="w-full bg-white/[0.04] border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500/50 transition"
      />
    </div>
  );
}
