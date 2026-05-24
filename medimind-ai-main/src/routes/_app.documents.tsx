import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Trash2, Upload, Database, CheckCircle2, Clock } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { deleteDocument, listDocuments, uploadDocument } from "@/services/ragService";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: listDocuments,
  });

  const del = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document supprimé");
    },
  });

  const up = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document ingéré");
    },
  });

  const totalSize = docs.reduce((s, d) => s + d.size, 0);
  const totalPages = docs.reduce((s, d) => s + d.pages, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents indexés</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Base de connaissances utilisée par le système RAG.
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-medical to-violet-soft text-primary-foreground text-sm font-medium shadow-elegant hover:brightness-110 transition"
          >
            <Upload className="h-4 w-4" />
            Importer un PDF
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach((f) => up.mutate(f));
              }
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Documents" value={docs.length.toString()} icon={FileText} />
          <Stat label="Pages totales" value={totalPages.toLocaleString()} icon={Database} />
          <Stat label="Stockage" value={formatSize(totalSize)} icon={CheckCircle2} />
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 mb-2 rounded-lg shimmer" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {docs.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition"
                >
                  <div className="h-10 w-10 rounded-lg bg-white/[0.04] border border-border/50 grid place-items-center text-medical-glow shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span>{d.pages} pages</span>
                      <span>·</span>
                      <span>{formatSize(d.size)}</span>
                      <span>·</span>
                      <span>{new Date(d.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                  <button
                    onClick={() => del.mutate(d.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
              {docs.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Aucun document ingéré.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3 shadow-soft">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-medical/30 to-violet-soft/30 grid place-items-center text-medical-glow">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "ready" | "processing" | "error" }) {
  if (status === "ready") {
    return (
      <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Prêt
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="text-[11px] px-2 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Traitement
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
      Erreur
    </span>
  );
}

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
