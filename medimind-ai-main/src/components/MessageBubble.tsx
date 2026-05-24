import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Image as ImageIcon,
  Sparkles,
  User,
  Volume2,
  Copy,
  Check,
} from "lucide-react";
import type { Message } from "@/store/useAppStore";
import { TypingLoader } from "./TypingLoader";
import { useState } from "react";
import { toast } from "sonner";

export function MessageBubble({ message }: { message: Message }) {
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
          <span className="font-medium text-foreground/90">
            {isUser ? "Vous" : "MediRAG"}
          </span>
          {message.detectedLang && !isUser && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-border/50 uppercase">
              {message.detectedLang}
            </span>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {message.attachments.map((a) => (
              <Attachment key={a.id} att={a} />
            ))}
          </div>
        )}

        {/* Content */}
        {message.content || message.streaming ? (
          <div className="prose-chat max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || "​"}
            </ReactMarkdown>
            {message.streaming && (
              <span className="inline-block w-1.5 h-4 align-middle bg-medical-glow/80 animate-pulse ml-0.5 rounded-sm" />
            )}
          </div>
        ) : (
          !isUser && <TypingLoader />
        )}

        {/* Sources & meta (assistant only, when done) */}
        {!isUser && !message.streaming && message.sources && message.sources.length > 0 && (
          <Footer message={message} />
        )}
      </div>
    </motion.div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div className="h-8 w-8 shrink-0 rounded-lg bg-white/[0.06] border border-border/60 grid place-items-center">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-medical to-violet-soft grid place-items-center shadow-elegant">
      <Sparkles className="h-4 w-4 text-primary-foreground" />
    </div>
  );
}

function Attachment({ att }: { att: { type: string; name: string; url: string } }) {
  if (att.type === "image") {
    return (
      <img
        src={att.url}
        alt={att.name}
        className="h-40 max-w-xs rounded-xl border border-border/60 object-cover shadow-soft"
      />
    );
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

function Footer({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const confidence = Math.round((message.confidence ?? 0) * 100);

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copié");
    setTimeout(() => setCopied(false), 1500);
  };

  const speak = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Synthèse vocale non supportée");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message.content.replace(/[#*`>]/g, ""));
    u.lang = message.detectedLang === "en" ? "en-US" : "fr-FR";
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Confiance</span>
          <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-medical to-violet-soft"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-foreground/80 font-medium">{confidence}%</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={copy}
          className="p-1.5 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition"
          aria-label="copier"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={speak}
          className="p-1.5 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition"
          aria-label="lire"
        >
          <Volume2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-1.5">
          Sources
        </div>
        <div className="flex flex-wrap gap-1.5">
          {message.sources?.map((s, i) => (
            <div
              key={s.id}
              className="group flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-white/[0.025] hover:bg-white/[0.05] hover:border-medical/40 transition cursor-pointer"
              title={s.snippet}
            >
              <span className="text-[10px] font-mono text-medical-glow">[{i + 1}]</span>
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[280px]">{s.title}</span>
              {s.page && <span className="text-muted-foreground">· p.{s.page}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
