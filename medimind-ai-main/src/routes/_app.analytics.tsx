import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Cpu, FileText, Zap } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

const usage = [
  { day: "Lun", q: 24 },
  { day: "Mar", q: 38 },
  { day: "Mer", q: 31 },
  { day: "Jeu", q: 52 },
  { day: "Ven", q: 47 },
  { day: "Sam", q: 19 },
  { day: "Dim", q: 12 },
];
const latency = [
  { day: "Lun", ms: 820 },
  { day: "Mar", ms: 760 },
  { day: "Mer", ms: 910 },
  { day: "Jeu", ms: 680 },
  { day: "Ven", ms: 720 },
  { day: "Sam", ms: 690 },
  { day: "Dim", ms: 710 },
];
const langs = [
  { name: "Français", value: 52, color: "oklch(0.72 0.16 230)" },
  { name: "Anglais", value: 28, color: "oklch(0.68 0.18 295)" },
  { name: "Hausa", value: 14, color: "oklch(0.78 0.15 180)" },
  { name: "Zarma", value: 6, color: "oklch(0.75 0.18 60)" },
];

function AnalyticsPage() {
  const convs = useAppStore((s) => s.conversations);
  const totalMessages = convs.reduce((s, c) => s + c.messages.length, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytique</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance et utilisation du moteur RAG.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Requêtes totales" value="1 248" trend="+12%" icon={Zap} />
          <Kpi label="Documents indexés" value="84" trend="+3" icon={FileText} />
          <Kpi label="Latence moyenne" value="742ms" trend="-8%" icon={Activity} />
          <Kpi label="Modèles actifs" value="4" trend="" icon={Cpu} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Requêtes / jour" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={usage}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.16 230)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.16 230)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                <XAxis dataKey="day" stroke="oklch(0.66 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.66 0.02 260)" fontSize={12} />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="q"
                  stroke="oklch(0.72 0.16 230)"
                  strokeWidth={2}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Répartition des langues">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={langs}
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {langs.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {langs.map((l) => (
                <div key={l.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-muted-foreground">{l.name}</span>
                  <span className="ml-auto text-foreground/80 font-medium">{l.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Temps de réponse (ms)" className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={latency}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                <XAxis dataKey="day" stroke="oklch(0.66 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.66 0.02 260)" fontSize={12} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="ms" radius={[8, 8, 0, 0]} fill="oklch(0.68 0.18 295)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="text-xs text-muted-foreground">
          Conversations locales : {convs.length} · Messages : {totalMessages}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 shadow-soft"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-medical-glow" />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {trend && (
        <div className="mt-0.5 text-[11px] text-emerald-400">{trend}</div>
      )}
    </motion.div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-4 shadow-soft ${className}`}>
      <div className="text-sm font-medium mb-3">{title}</div>
      {children}
    </div>
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
