import { useCallback, useEffect, useRef, useState } from "react";
import { LANG_LOCALE, type Lang } from "@/lib/i18n";

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_>~[\]()]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function getBestVoice(locale: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const lang = locale.split("-")[0];
  return (
    voices.find((v) => v.lang === locale) ??
    voices.find((v) => v.lang.startsWith(lang)) ??
    null
  );
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const speak = useCallback((text: string, lang: Lang, rate = 1.0) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(stripMarkdown(text));
    u.lang = LANG_LOCALE[lang];
    u.rate = rate;

    const assignVoice = () => {
      const voice = getBestVoice(LANG_LOCALE[lang]);
      if (voice) u.voice = voice;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      assignVoice();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", assignVoice, { once: true });
    }

    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(
    (text: string, lang: Lang, rate?: number) => {
      if (speaking) stop();
      else speak(text, lang, rate);
    },
    [speaking, speak, stop],
  );

  return { speaking, supported, speak, stop, toggle };
}
