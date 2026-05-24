import { useAppStore } from "@/store/useAppStore";
import { t as translate } from "@/lib/i18n";

export function useT() {
  const language = useAppStore((s) => s.language);
  return (key: string) => translate(language, key);
}
