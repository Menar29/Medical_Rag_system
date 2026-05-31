import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, Cpu, FileText, Loader2, Users, Zap } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { adminGetAnalytics, type AnalyticsData } from "@/services/ragService";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

const LANG_COLORS: Record<string, string> = {
  fr: "oklch(0.72 0.16 230)",
  en: "oklch(0.68 0.18 295)",
  ha: "oklch(0.78 0.15 180)",
};
const LANG_LABELS: Record<string, string> = { fr: "Français", en: "Anglais", ha: "Hausa" };

function AnalyticsPage() {
  const navigate = useNavigate();
  const userRole = useAppStore((s) => s.userRole);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== "admin") { navigate({ to: "/" }); return; }
    adminGetAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userRole, navigate]);

  if (userRole !== "admin") return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Chargement des données…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-destructive">{error}</div>
    );
  }

  const { users, queries } = data!;

  // Répartition langues utilisateurs pour PieChart
  const langPie = Object.entries(users.by_language)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: LANG_LABELS[k] ?? k, value: v, color: LANG_COLORS[k] }));

  // Si aucune requête loggée, on le signale
  const noQueries = queries.total === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytique</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Données réelles — utilisateurs, requêtes et performance.
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Utilisateurs" value={String(users.total)} icon={Users} />
          <Kpi label="Requêtes totales" value={String(queries.total)} icon={Zap} />
          <Kpi
            label="Latence moyenne"
            value={queries.avg_latency_ms > 0 ? `${queries.avg_latency_ms}ms` : "—"}
            icon={Activity}
          />
          <Kpi
            label="Rôles actifs"
            value={String(Object.values(users.by_role).filter((v) => v > 0).length)}
            icon={Cpu}
          />
        </div>

        {/* Rôles répartition */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-5 space-y-3 shadow-soft">
            <div className="text-sm font-medium">Utilisateurs par rôle</div>
            {[
              { key: "patient", label: "Patientes", color: "bg-rose-400" },
              { key: "professional", label: "Professionnels", color: "bg-blue-400" },
              { key: "admin", label: "Admins", color: "bg-amber-400" },
            ].map(({ key, label, color }) => {
              const count = users.by_role[key as keyof typeof users.by_role] ?? 0;
              const pct = users.total > 0 ? Math.round((count / users.total) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Répartition langues utilisateurs */}
          <div className="glass rounded-2xl p-5 shadow-soft">
            <div className="text-sm font-medium mb-3">Langue des utilisateurs</div>
            {langPie.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={langPie} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                      {langPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {langPie.map((l) => (
                    <div key={l.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                      <span className="text-muted-foreground">{l.name}</span>
                      <span className="ml-auto font-medium">{l.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground py-4">Aucune donnée</div>
            )}
          </div>

          {/* Inscriptions / jour */}
          <div className="glass rounded-2xl p-5 shadow-soft">
            <div className="text-sm font-medium mb-3">Inscriptions (7 jours)</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={users.registrations_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                <XAxis dataKey="day" stroke="oklch(0.66 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.66 0.02 260)" fontSize={11} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="inscriptions" radius={[6, 6, 0, 0]} fill="oklch(0.72 0.16 230)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Requêtes section */}
        {noQueries ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground shadow-soft">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Aucune requête enregistrée pour l'instant. Les données apparaîtront après les premières conversations.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Requêtes / jour */}
            <div className="glass rounded-2xl p-5 shadow-soft lg:col-span-2">
              <div className="text-sm font-medium mb-3">Requêtes / jour</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={queries.by_day}>
                  <defs>
                    <linearGradient id="qg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.16 230)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.72 0.16 230)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                  <XAxis dataKey="day" stroke="oklch(0.66 0.02 260)" fontSize={11} />
                  <YAxis stroke="oklch(0.66 0.02 260)" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" name="requêtes" stroke="oklch(0.72 0.16 230)" strokeWidth={2} fill="url(#qg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Langue des requêtes */}
            <div className="glass rounded-2xl p-5 shadow-soft">
              <div className="text-sm font-medium mb-3">Langue des requêtes</div>
              {Object.entries(queries.by_language).filter(([, v]) => v > 0).map(([k, v]) => {
                const pct = queries.total > 0 ? Math.round((v / queries.total) * 100) : 0;
                return (
                  <div key={k} className="space-y-1 mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{LANG_LABELS[k] ?? k}</span>
                      <span>{v} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: LANG_COLORS[k] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Latence / jour */}
            <div className="glass rounded-2xl p-5 shadow-soft lg:col-span-3">
              <div className="text-sm font-medium mb-3">Latence moyenne / jour (ms)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={queries.latency_by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                  <XAxis dataKey="day" stroke="oklch(0.66 0.02 260)" fontSize={11} />
                  <YAxis stroke="oklch(0.66 0.02 260)" fontSize={11} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="ms" name="ms" radius={[6, 6, 0, 0]} fill="oklch(0.68 0.18 295)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-medical-glow" />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </motion.div>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs shadow-elegant">
      {label && <div className="font-medium mb-0.5">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium ml-1">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
