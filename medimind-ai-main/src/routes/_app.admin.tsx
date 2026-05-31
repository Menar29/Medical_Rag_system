import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  HeartPulse, Loader2, Shield, Stethoscope, Trash2, UserCog, Users,
} from "lucide-react";
import { useAppStore, type UserProfile } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";
import { adminListUsers, adminChangeRole, adminDeleteUser } from "@/services/ragService";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
});

const ROLE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  patient:      { label: "Patiente",       icon: HeartPulse,  color: "text-rose-400 bg-rose-400/10 border-rose-400/30" },
  professional: { label: "Professionnel",  icon: Stethoscope, color: "text-medical-glow bg-medical/10 border-medical/30" },
  admin:        { label: "Administrateur", icon: Shield,       color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
};

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.patient;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function AdminPage() {
  const t = useT();
  const navigate = useNavigate();
  const userRole = useAppStore((s) => s.userRole);
  const currentUser = useAppStore((s) => s.user);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Guard — redirect non-admins
  useEffect(() => {
    if (userRole !== "admin") { navigate({ to: "/" }); }
  }, [userRole, navigate]);

  useEffect(() => {
    if (userRole !== "admin") return;
    adminListUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userRole]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      const updated = await adminChangeRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      toast.success("Rôle mis à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setChangingRole(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    setDeletingId(userId);
    try {
      await adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Utilisateur supprimé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  // Stats
  const stats = {
    total: users.length,
    patients: users.filter((u) => u.role === "patient").length,
    professionals: users.filter((u) => u.role === "professional").length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  if (userRole !== "admin") return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 grid place-items-center shadow-elegant">
            <Shield className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t("admin_users_title")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t("admin_users_sub")}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
            { label: "Patientes", value: stats.patients, icon: HeartPulse, color: "text-rose-400" },
            { label: "Professionnels", value: stats.professionals, icon: Stethoscope, color: "text-medical-glow" },
            { label: "Admins", value: stats.admins, icon: Shield, color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 space-y-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div className="glass rounded-2xl overflow-hidden shadow-soft">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-destructive">{error}</div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Aucun utilisateur</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Nom", "Email", "Rôle", "Inscrit le", "Actions"].map((h) => (
                      <th key={h} className="text-left text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 last:border-0 hover:bg-white/[0.02] transition"
                      >
                        {/* Nom */}
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {[user.prenom, user.nom].filter(Boolean).join(" ") || "—"}
                          </div>
                          {isSelf && <span className="text-[10px] text-amber-400">(vous)</span>}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>

                        {/* Rôle */}
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(user.created_at ?? Date.now()).toLocaleDateString("fr-FR")}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          {!isSelf && (
                            <div className="flex items-center gap-2">
                              <select
                                value={user.role}
                                disabled={changingRole === user.id}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                className="text-xs bg-white/[0.04] border border-border/50 rounded-lg px-2 py-1 outline-none focus:border-amber-500/50 transition disabled:opacity-50"
                              >
                                <option value="patient">Patiente</option>
                                <option value="professional">Professionnel</option>
                                <option value="admin">Admin</option>
                              </select>
                              {changingRole === user.id && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              )}
                              <button
                                onClick={() => handleDelete(user.id)}
                                disabled={deletingId === user.id}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                                title="Supprimer"
                              >
                                {deletingId === user.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />
                                }
                              </button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
