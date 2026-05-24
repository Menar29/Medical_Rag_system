import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, FileText, Image as ImageIcon, Mic, Stethoscope } from "lucide-react";
import { useAppStore, type Attachment, type Message } from "@/store/useAppStore";
import { useT } from "@/hooks/useT";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { streamQuery } from "@/services/ragService";

const uid = () => Math.random().toString(36).slice(2, 10);

export function ChatContainer() {
  const t = useT();
  const language = useAppStore((s) => s.language);
  const model = useAppStore((s) => s.model);
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

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      attachments: attachments.length ? attachments : undefined,
    };
    addMessage(conv, userMsg);

    const asstId = uid();
    addMessage(conv, {
      id: asstId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
    });

    try {
      let acc = "";
      for await (const evt of streamQuery({
        prompt: text,
        language,
        model,
        files: [],
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
    } catch {
      updateMessage(conv, asstId, {
        streaming: false,
        content: "Une erreur est survenue. Réessayez.",
      });
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{ background: "var(--gradient-glow)" }}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <Welcome onPick={(q) => send(q, [])} />
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      <ChatInput onSubmit={send} />
    </div>
  );

  function Welcome({ onPick }: { onPick: (q: string) => void }) {
    const suggestions = [
      { key: "suggestions_1", icon: Stethoscope },
      { key: "suggestions_2", icon: FileText },
      { key: "suggestions_3", icon: ImageIcon },
      { key: "suggestions_4", icon: Sparkles },
    ];
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-xl"
        >
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-medical to-violet-soft grid place-items-center shadow-elegant mb-5">
            <Stethoscope className="h-6 w-6 text-primary-foreground" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            <span className="gradient-text">{t("welcome_title")}</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("welcome_sub")}</p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
          }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl"
        >
          {suggestions.map((s) => (
            <motion.button
              key={s.key}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              onClick={() => onPick(t(s.key))}
              className="group text-left flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-white/[0.02] hover:bg-white/[0.04] hover:border-medical/40 transition shadow-soft"
            >
              <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-border/50 grid place-items-center text-medical-glow group-hover:scale-110 transition">
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-foreground/90 leading-relaxed">{t(s.key)}</span>
            </motion.button>
          ))}
        </motion.div>

        <div className="mt-12 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Mic className="h-3 w-3" />
          <FileText className="h-3 w-3" />
          <ImageIcon className="h-3 w-3" />
          <span>Multimodal · RAG · 4 langues</span>
        </div>
      </div>
    );
  }
}
