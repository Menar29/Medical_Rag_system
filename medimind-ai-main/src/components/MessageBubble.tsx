import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check, Copy, FileText, Image as ImageIcon,
  Sparkles, ThumbsDown, ThumbsUp, User, Volume2, VolumeX,
} from "lucide-react";
import type { Message } from "@/store/useAppStore";
import { useAppStore } from "@/store/useAppStore";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useRoleTheme } from "@/hooks/useRoleTheme";
import { useT } from "@/hooks/useT";
import { submitFeedback } from "@/services/ragService";
import { TypingLoader } from "./TypingLoader";
import { toast } from "sonner";

export function MessageBubble({ message, conversationId }: { message: Message; conversationId?: string }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-3 px-4 sm:px-6 py-5 ${isUser ? "" : "bg-white/[0.015]"}`}
    >
      <Avatar role={message.role} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/90">{isUser ? "Vous" : "CerviScan AI"}</span>
          {message.detectedLang && !isUser && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-border/50 uppercase">
              {message.detectedLang}
            </span>
          )}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {message.attachments.map((a) => <Attachment key={a.id} att={a} />)}
          </div>
        )}

        {message.content || message.streaming ? (
          <div className="prose-chat max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || "​"}</ReactMarkdown>
            {message.streaming && (
              <span className="inline-block w-1.5 h-4 align-middle bg-medical-glow/80 animate-pulse ml-0.5 rounded-sm" />
            )}
          </div>
        ) : (
          !isUser && <TypingLoader />
        )}

        {!isUser && !message.streaming && <Footer message={message} conversationId={conversationId} />}
      </div>
    </motion.div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  const theme = useRoleTheme();
  if (role === "user") {
    return (
      <div className="h-8 w-8 shrink-0 rounded-lg bg-white/[0.06] border border-border/60 grid place-items-center">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className={`h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br ${theme.gradient} grid place-items-center shadow-elegant`}>
      <Sparkles className="h-4 w-4 text-primary-foreground" />
    </div>
  );
}

function Attachment({ att }: { att: { type: string; name: string; url: string } }) {
  if (att.type === "image") {
    return <img src={att.url} alt={att.name} className="h-40 max-w-xs rounded-xl border border-border/60 object-cover shadow-soft" />;
  }
  if (att.type === "pdf") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-white/[0.03] text-sm max-w-xs">
        <FileText className="h-4 w-4 text-medical-glow shrink-0" />
        <span className="truncate">{att.name}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-white/[0.03] text-sm">
      <ImageIcon className="h-4 w-4" />
      <span className="truncate">{att.name}</span>
    </div>
  );
}

function Footer({ message, conversationId }: { message: Message; conversationId?: string }) {
  const t = useT();
  const theme = useRoleTheme();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const confidence = Math.round((message.confidence ?? 0) * 100);
  const language = useAppStore((s) => s.language);
  const autoPlay = useAppStore((s) => s.autoPlay);
  const voiceEnabled = useAppStore((s) => s.voiceEnabled);
  const { speaking, supported: ttsSupported, speak, stop } = useSpeechSynthesis();

  useEffect(() => {
    if (autoPlay && voiceEnabled && message.content) {
      speak(message.content, message.detectedLang ?? language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copié");
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleSpeak = () => {
    if (!ttsSupported) { toast.error(t("tts_not_supported")); return; }
    speaking ? stop() : speak(message.content, message.detectedLang ?? language);
  };

  const giveFeedback = async (value: "up" | "down") => {
    if (feedback) return;
    setFeedback(value);
    toast.success(t("feedback_thanks"));
    // Fire-and-forget to backend
    submitFeedback({
      rating: value,
      query: "",           // caller can enrich if needed
      response: message.content,
      messageId: message.id,
      conversationId,
    }).catch(() => null);  // silent — feedback is best-effort
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {confidence > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-2">
            <span>Confiance</span>
            <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${theme.gradient}`} style={{ width: `${confidence}%` }} />
            </div>
            <span className="text-foreground/80 font-medium">{confidence}%</span>
          </div>
        )}
        <div className="flex-1" />

        {/* Copy */}
        <button onClick={copy} className="p-1.5 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition" title="Copier">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>

        {/* TTS */}
        {voiceEnabled && (
          <button onClick={toggleSpeak} className={`p-1.5 rounded-md transition ${speaking ? "text-medical bg-medical/10 hover:bg-medical/20" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"}`} title={speaking ? t("stop_reading") : t("read_aloud")}>
            {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Feedback separator */}
        <div className="w-px h-4 bg-border/50 mx-1" />

        {/* Thumbs up */}
        <button
          onClick={() => giveFeedback("up")}
          disabled={feedback !== null}
          title={t("feedback_helpful")}
          className={`p-1.5 rounded-md transition disabled:opacity-50 ${feedback === "up" ? "text-emerald-400 bg-emerald-400/10" : "text-muted-foreground hover:text-emerald-400 hover:bg-white/[0.05]"}`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>

        {/* Thumbs down */}
        <button
          onClick={() => giveFeedback("down")}
          disabled={feedback !== null}
          title={t("feedback_not_helpful")}
          className={`p-1.5 rounded-md transition disabled:opacity-50 ${feedback === "down" ? "text-rose-400 bg-rose-400/10" : "text-muted-foreground hover:text-rose-400 hover:bg-white/[0.05]"}`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-1.5">Sources</div>
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((s, i) => (
              <div key={s.id} className="group flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-white/[0.025] hover:bg-white/[0.05] hover:border-medical/40 transition cursor-pointer" title={s.snippet}>
                <span className="text-[10px] font-mono text-medical-glow">[{i + 1}]</span>
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[280px]">{s.title}</span>
                {s.page && <span className="text-muted-foreground">· p.{s.page}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
