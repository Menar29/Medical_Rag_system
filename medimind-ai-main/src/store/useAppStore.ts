import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n";

export type Attachment = {
  id: string;
  type: "image" | "pdf" | "audio";
  name: string;
  url: string; // object URL for preview
  size: number;
};

export type Source = {
  id: string;
  title: string;
  page?: number;
  snippet?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  attachments?: Attachment[];
  sources?: Source[];
  confidence?: number;
  detectedLang?: Lang;
  streaming?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};

export type ModelId =
  | "gemma-3-multimodal"
  | "qwen-vl"
  | "llava-1.6"
  | "gpt-4o-vision";

type State = {
  language: Lang;
  setLanguage: (l: Lang) => void;

  model: ModelId;
  setModel: (m: ModelId) => void;

  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;

  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;

  conversations: Conversation[];
  activeId: string | null;
  setActive: (id: string) => void;
  newConversation: () => string;
  addMessage: (convId: string, msg: Message) => void;
  updateMessage: (convId: string, msgId: string, patch: Partial<Message>) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      language: "fr",
      setLanguage: (l) => set({ language: l }),

      model: "gemma-3-multimodal",
      setModel: (m) => set({ model: m }),

      autoPlay: false,
      setAutoPlay: (v) => set({ autoPlay: v }),

      voiceEnabled: true,
      setVoiceEnabled: (v) => set({ voiceEnabled: v }),

      conversations: [],
      activeId: null,

      setActive: (id) => set({ activeId: id }),

      newConversation: () => {
        const id = uid();
        const conv: Conversation = {
          id,
          title: "Nouvelle conversation",
          createdAt: Date.now(),
          messages: [],
        };
        set({ conversations: [conv, ...get().conversations], activeId: id });
        return id;
      },

      addMessage: (convId, msg) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, msg],
                  title:
                    c.messages.length === 0 && msg.role === "user"
                      ? msg.content.slice(0, 40) || c.title
                      : c.title,
                }
              : c,
          ),
        })),

      updateMessage: (convId, msgId, patch) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
                }
              : c,
          ),
        })),

      renameConversation: (id, title) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        })),

      deleteConversation: (id) =>
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== id);
          const activeId = s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
          return { conversations, activeId };
        }),
    }),
    {
      name: "medirag-store",
      partialize: (s) => ({
        language: s.language,
        model: s.model,
        autoPlay: s.autoPlay,
        voiceEnabled: s.voiceEnabled,
        conversations: s.conversations,
        activeId: s.activeId,
      }),
    },
  ),
);
