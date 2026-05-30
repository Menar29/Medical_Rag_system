export type Lang = "fr" | "en" | "ha" | "za";

export const LANGUAGES: { code: Lang; label: string; flag: string; locale: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷", locale: "fr-FR" },
  { code: "en", label: "English", flag: "🇬🇧", locale: "en-US" },
  { code: "ha", label: "Hausa", flag: "🇳🇬", locale: "ha-NE" },
  { code: "za", label: "Zulu", flag: "🇿🇦", locale: "zu-ZA" },
];

export const LANG_LOCALE: Record<Lang, string> = {
  fr: "fr-FR",
  en: "en-US",
  ha: "ha-NE",
  za: "zu-ZA",
};

const translations: Record<Lang, Record<string, string>> = {
  fr: {
    ask_placeholder: "Posez votre question médicale...",
    listening: "Je vous écoute...",
    upload_pdf: "Joindre un PDF",
    upload_image: "Joindre une image",
    record: "Dicter ma question",
    send: "Envoyer",
    stt_not_supported: "Reconnaissance vocale non supportée dans ce navigateur",
    tts_not_supported: "Synthèse vocale non supportée",
    mic_denied: "Accès au microphone refusé",
    stop_recording: "Arrêter",
    read_aloud: "Lire à voix haute",
    stop_reading: "Arrêter la lecture",
  },
  en: {
    ask_placeholder: "Ask your medical question...",
    listening: "Listening...",
    upload_pdf: "Attach PDF",
    upload_image: "Attach image",
    record: "Dictate my question",
    send: "Send",
    stt_not_supported: "Speech recognition not supported in this browser",
    tts_not_supported: "Text-to-speech not supported",
    mic_denied: "Microphone access denied",
    stop_recording: "Stop",
    read_aloud: "Read aloud",
    stop_reading: "Stop reading",
  },
  ha: {
    ask_placeholder: "Yi tambayar kiwon lafiya...",
    listening: "Ina saurare...",
    upload_pdf: "Haɗa PDF",
    upload_image: "Haɗa hoto",
    record: "Fada tambaya",
    send: "Aika",
    stt_not_supported: "Ba a goyi bayan sauti a wannan mai bincike ba",
    tts_not_supported: "Ba a goyi bayan karatu ba",
    mic_denied: "An hana shiga makirufo",
    stop_recording: "Tsaya",
    read_aloud: "Karanta da murya",
    stop_reading: "Tsaya karatu",
  },
  za: {
    ask_placeholder: "Buza umbuzo wezempilo...",
    listening: "Ngiyalalela...",
    upload_pdf: "Namathelisa i-PDF",
    upload_image: "Namathelisa isithombe",
    record: "Khuluma umbuzo",
    send: "Thumela",
    stt_not_supported: "Ukuqonda inkulumo akusekelwa kulesi sizindalwazi",
    tts_not_supported: "Ukufundwa kombhalo akusekelwa",
    mic_denied: "Ukufinyelela kwi-microphone kwenqatshelwe",
    stop_recording: "Misa",
    read_aloud: "Funda ngezwi",
    stop_reading: "Misa ukufunda",
  },
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.fr[key] ?? key;
}
