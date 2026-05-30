import { useCallback, useEffect, useRef, useState } from "react";
import { LANG_LOCALE, type Lang } from "@/lib/i18n";

// Vendor-prefixed Web Speech API types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

function getSR(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(lang: Lang) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [supported] = useState(() => !!getSR());
  const ref = useRef<SR>(null);

  useEffect(() => () => ref.current?.abort(), []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getSR();
      if (!Ctor) return;

      ref.current?.abort();

      const rec: SR = new Ctor();
      rec.lang = LANG_LOCALE[lang];
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setListening(true);

      rec.onresult = (e: SR) => {
        let interim = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text: string = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += text;
          else interim += text;
        }
        setInterimText(interim);
        if (final) {
          setInterimText("");
          onFinal(final.trim());
        }
      };

      rec.onend = () => {
        setListening(false);
        setInterimText("");
        ref.current = null;
      };

      rec.onerror = (e: SR) => {
        if (e.error !== "aborted") setListening(false);
        setInterimText("");
        ref.current = null;
      };

      ref.current = rec;
      rec.start();
    },
    [lang],
  );

  const stop = useCallback(() => {
    ref.current?.stop();
    ref.current = null;
    setListening(false);
    setInterimText("");
  }, []);

  return { listening, interimText, supported, start, stop };
}
