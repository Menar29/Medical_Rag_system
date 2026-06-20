import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, HeartPulse, Mic, Shield, Sparkles, Stethoscope, Syringe } from "lucide-react";
import { useAppStore, type Attachment, type Message } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { streamQuery, analyzeReport } from "@/services/ragService";
import { toast } from "sonner";

const uid = () => Math.random().toString(36).slice(2, 10);

const PATIENT_SUGGESTIONS = [
  { key: "suggestions_1", icon: HeartPulse, color: "text-rose-400" },
  { key: "suggestions_2", icon: Syringe,   color: "text-emerald-400" },
  { key: "suggestions_3", icon: Sparkles,  color: "text-amber-400" },
  { key: "suggestions_4", icon: Shield,    color: "text-medical-glow" },
];

const PRO_SUGGESTIONS = [
  { key: "suggestion_pro_1", icon: BookOpen,    color: "text-medical-glow" },
  { key: "suggestion_pro_2", icon: Stethoscope, color: "text-violet-400" },
  { key: "suggestion_pro_3", icon: Shield,      color: "text-amber-400" },
  { key: "suggestion_pro_4", icon: Syringe,     color: "text-emerald-400" },
];

function PatientWelcome({ onPick }: { onPick: (q: string) => void }) {
  const t = useT();
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-center max-w-lg">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 grid place-items-center shadow-elegant mb-5">
          <HeartPulse className="h-8 w-8 text-white" strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          <span className="gradient-text">{t("welcome_title")}</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">{t("welcome_sub")}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-medical/30 bg-medical/5 text-xs text-medical-glow">
          <Mic className="h-3 w-3" />
          {t("welcome_voice_hint")}
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {PATIENT_SUGGESTIONS.map((s) => (
          <motion.button key={s.key} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => onPick(t(s.key))} className="group flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-white/[0.025] hover:bg-white/[0.05] hover:border-rose-500/30 transition-all shadow-soft text-left">
            <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-border/50 grid place-items-center shrink-0 group-hover:scale-105 transition">
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <span className="text-sm text-foreground/85 leading-relaxed">{t(s.key)}</span>
          </motion.button>
        ))}
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 text-center text-[11px] text-muted-foreground/55 max-w-sm leading-relaxed">
        {t("disclaimer")}
      </motion.p>
    </div>
  );
}

function ProfessionalWelcome({ onPick }: { onPick: (q: string) => void }) {
  const t = useT();
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center max-w-xl">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-medical to-violet-soft grid place-items-center shadow-elegant mb-4">
          <Stethoscope className="h-7 w-7 text-white" strokeWidth={2.2} />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          <span className="gradient-text">{t("welcome_title_pro")}</span>
        </h1>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">{t("welcome_sub_pro")}</p>
      </motion.div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }} className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
        {PRO_SUGGESTIONS.map((s) => (
          <motion.button key={s.key} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => onPick(t(s.key))} className="group flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-white/[0.02] hover:bg-white/[0.04] hover:border-medical/35 transition-all text-left">
            <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-border/50 grid place-items-center shrink-0">
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            </div>
            <span className="text-sm text-foreground/85">{t(s.key)}</span>
          </motion.button>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground/60">
        <Shield className="h-3 w-3 text-emerald-400" />
        <span>Sources : OMS · Protocoles MSP Niger · Littérature médicale</span>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-3 text-center text-[11px] text-muted-foreground/50 max-w-sm">
        {t("disclaimer_pro")}
      </motion.p>
    </div>
  );
}

export function ChatContainer() {
  const language = useAppStore((s) => s.language);
  const model = useAppStore((s) => s.model);
  const userRole = useAppStore((s) => s.userRole);
  const user = useAppStore((s) => s.user);
  const conversations = useAppStore((s) => s.conversations);
  const activeId = useAppStore((s) => s.activeId);
  const newConversation = useAppStore((s) => s.newConversation);
  const addMessage = useAppStore((s) => s.addMessage);
  const updateMessage = useAppStore((s) => s.updateMessage);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const send = async (text: string, attachments: Attachment[]) => {
    let convId = activeId;
    if (!convId) convId = newConversation();
    const conv = convId!;
    const userMsg: Message = { id: uid(), role: "user", content: text, createdAt: Date.now(), attachments: attachments.length ? attachments : undefined };
    addMessage(conv, userMsg);
    const asstId = uid();
    addMessage(conv, { id: asstId, role: "assistant", content: "", createdAt: Date.now(), streaming: true });
    // Build history from previous messages (exclude the new ones just added)
    const history = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));

    // Patient context from user profile
    let patientContext: Record<string, string | number> | undefined =
      userRole === "patient" && user
        ? {
            ...(user.age    ? { age: user.age }       : {}),
            ...(user.region ? { region: user.region } : {}),
          }
        : undefined;

    // Si une image de bilan est jointe : OCR-NLP -> patient_context fusionne
    const report = attachments.find((a) => a.type === "image");
    if (report) {
      try {
        updateMessage(conv, asstId, { content: "_Analyse du bilan biologique en cours…_" });
        const blob = await fetch(report.url).then((r) => r.blob());
        const analysis = await analyzeReport(blob, report.name);
        if (analysis.patient_context && Object.keys(analysis.patient_context).length) {
          patientContext = { ...(patientContext ?? {}), ...analysis.patient_context };
          const nb = Array.isArray(analysis.lab_results) ? analysis.lab_results.length : 0;
          toast.success(`Bilan analysé : ${nb} résultat(s) extrait(s)`);
        }
      } catch (e) {
        const m = e instanceof Error ? e.message : "erreur";
        toast.error(`Analyse du bilan impossible : ${m}`);
      } finally {
        updateMessage(conv, asstId, { content: "" });
      }
    }

    try {
      let acc = "";
      for await (const evt of streamQuery({
        prompt: text,
        language,
        history,
        patient_context: patientContext,
      })) {
        if (evt.type === "chunk") {
          acc += evt.text;
          updateMessage(conv, asstId, { content: acc });
        } else {
          updateMessage(conv, asstId, {
            streaming: false,
            sources: evt.meta.sources,
            confidence: evt.meta.confidence,
            detectedLang: evt.meta.detectedLang,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      updateMessage(conv, asstId, {
        streaming: false,
        content: `❌ **Erreur** : ${msg}\n\nVérifiez que le backend est démarré sur le port 8001.`,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: "var(--gradient-glow)" }} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          userRole === "professional"
            ? <ProfessionalWelcome onPick={(q) => send(q, [])} />
            : <PatientWelcome onPick={(q) => send(q, [])} />
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((m) => <MessageBubble key={m.id} message={m} conversationId={activeId ?? undefined} />)}
          </div>
        )}
      </div>
      <ChatInput onSubmit={send} />
    </div>
  );
}
