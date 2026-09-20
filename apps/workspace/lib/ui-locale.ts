export type LearnerUiLocale = "en" | "zh";

const HAN = /[\u3400-\u9fff]/;

export function resolveLearnerUiLocale(
  preferredLanguage?: string,
  samples: Array<string | undefined> = [],
): LearnerUiLocale {
  const preferred = (preferredLanguage || "").trim().toLowerCase();
  if (
    preferred.includes("chinese")
    || preferred.includes("中文")
    || preferred.includes("汉语")
    || preferred.includes("漢語")
    || preferred.includes("华语")
    || preferred.includes("華語")
    || /^zh(?:[-_]|$)/.test(preferred)
  ) return "zh";
  if (
    preferred.includes("english")
    || preferred.includes("英文")
    || /^en(?:[-_]|$)/.test(preferred)
  ) return "en";
  return samples.some((sample) => Boolean(sample && HAN.test(sample))) ? "zh" : "en";
}

export function uiText(locale: LearnerUiLocale, english: string, chinese: string): string {
  return locale === "zh" ? chinese : english;
}

export function uiMoveLabel(locale: LearnerUiLocale, value: string): string {
  if (locale !== "zh") return value.replaceAll("-", " ");
  const labels: Record<string, string> = {
    "current-runtime-move": "当前学习动作",
    "frontier-deep-attempt": "深入独立尝试",
    "frontier-guided-attempt": "引导式尝试",
    "frontier-short-retrieval": "短时提取练习",
    "continue-frontier": "继续当前前沿",
    none: "等待当前步骤完成",
  };
  return labels[value] || value.replaceAll("-", " ");
}
