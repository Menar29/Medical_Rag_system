import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAppStore } from "@/store/useAppStore";
import { useRoleTheme } from "@/hooks/useRoleTheme";
import { toast } from "sonner";
import type { Attachment } from "@/store/useAppStore";

type Props = {
  onSubmit: (text: string, attachments: Attachment[]) => void;
  disabled?: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export function ChatInput({ onSubmit, disabled }: Props) {
  const t = useT();
  const theme = useRoleTheme();
  const language = useAppStore((s) => s.language);
  const userRole = useAppStore((s) => s.userRole);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDrag, setIsDrag] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const { listening, interimText, supported: sttSupported, start, stop } =
    useSpeechRecognition(language);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  }, [text]);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const next: Attachment[] = arr.map((f) => ({
      id: uid(),
      type: f.type.startsWith("image/") ? "image" : "pdf",
      name: f.name,
      url: URL.createObjectURL(f),
      size: f.size,
    }));
    setAttachments((a) => [...a, ...next]);
  };

  const handleSubmit = () => {
    if (disabled) return;
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    onSubmit(trimmed, attachments);
    setText("");
    setAttachments([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoice = () => {
    if (listening) {
      stop();
      return;
    }
    if (!sttSupported) {
      toast.error(t("stt_not_supported"));
      return;
    }
    start((final) => {
      setText((prev) => (prev ? prev + " " + final : final));
    });
  };

  return (
    <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2">
      <div className="max-w-3xl mx-auto">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDrag(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          className={`glass-strong rounded-2xl shadow-elegant transition-all ${
            isDrag ? `ring-2 ${theme.ring} scale-[1.005]` : ""
          }`}
        >
          {/* Attachments preview */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border/50"
              >
                <div className="flex flex-wrap gap-2 p-3">
                  {attachments.map((a) => (
                    <AttachmentChip
                      key={a.id}
                      att={a}
                      onRemove={() =>
                        setAttachments((arr) => arr.filter((x) => x.id !== a.id))
                      }
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              listening
                ? interimText || t("listening")
                : userRole === "professional"
                  ? t("ask_placeholder_pro")
                  : t("ask_placeholder")
            }
            rows={1}
            readOnly={listening}
            disabled={disabled}
            className="w-full resize-none bg-transparent px-4 pt-4 pb-2 outline-none placeholder:text-muted-foreground/70 text-[15px] leading-relaxed"
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex items-center gap-1">
              <IconBtn
                title={t("upload_pdf")}
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                title={t("upload_image")}
                onClick={() => imgRef.current?.click()}
                disabled={disabled}
              >
                <ImageIcon className="h-4 w-4" />
              </IconBtn>

              {/* Voice / STT button */}
              {listening ? (
                <button
                  onClick={toggleVoice}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-medical/15 text-medical border border-medical/30 text-xs"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-medical opacity-60 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-medical" />
                  </span>
                  {t("listening")}
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <IconBtn
                  title={sttSupported ? t("record") : t("stt_not_supported")}
                  onClick={toggleVoice}
                  disabled={disabled}
                  active={false}
                >
                  {sttSupported ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4 opacity-40" />
                  )}
                </IconBtn>
              )}

            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSubmit}
              disabled={disabled || (!text.trim() && attachments.length === 0)}
              className={`h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br ${theme.gradient} text-primary-foreground shadow-elegant disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-110 transition`}
              aria-label={t("send")}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
            </motion.button>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
          {t("disclaimer")}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`h-9 w-9 rounded-lg grid place-items-center transition disabled:opacity-40 ${
        active
          ? "text-medical bg-medical/10"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
      }`}
    >
      {children}
    </button>
  );
}

function AttachmentChip({
  att,
  onRemove,
}: {
  att: Attachment;
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="relative group"
    >
      {att.type === "image" ? (
        <img
          src={att.url}
          alt={att.name}
          className="h-16 w-16 rounded-lg object-cover border border-border/60"
        />
      ) : (
        <div className="flex items-center gap-2 h-16 px-3 rounded-lg border border-border/60 bg-white/[0.03] text-xs max-w-[220px]">
          <FileText className="h-4 w-4 text-medical-glow shrink-0" />
          <span className="truncate">{att.name}</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border grid place-items-center opacity-0 group-hover:opacity-100 transition hover:bg-destructive hover:text-destructive-foreground"
        aria-label="remove"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}
