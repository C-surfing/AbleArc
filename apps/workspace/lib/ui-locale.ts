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


export function uiSessionShape(locale: LearnerUiLocale, moveType: string): {
  sessionShape: string;
  contextRationale?: string;
} {
  if (locale !== "zh") return { sessionShape: "", contextRationale: undefined };
  const copy: Record<string, { sessionShape: string; contextRationale?: string }> = {
    none: {
      sessionShape: "先完成当前步骤，不开始新的学习动作。",
    },
    "current-runtime-move": {
      sessionShape: "继续当前学习动作，并根据今天的时间与精力控制投入深度。",
      contextRationale: "当前学习动作仍是主线；今天的状态只影响本次学习如何展开。",
    },
    "frontier-deep-attempt": {
      sessionShape: "先做一次尽量少提示的深入独立尝试，再根据结果决定是否需要解释或提示。",
      contextRationale: "当前时间、精力和专注度适合更深入的独立尝试。",
    },
    "frontier-guided-attempt": {
      sessionShape: "做一次范围明确的尝试，保留必要结构以维持推进，再根据结果调整。",
      contextRationale: "当前状态适合中等规模、带少量结构的学习动作。",
    },
    "frontier-short-retrieval": {
      sessionShape: "把本次学习控制在较小范围：先提取核心想法，暴露一个不确定点，再停止或重新判断。",
      contextRationale: "当前时间或精力更适合短而明确的提取与诊断，而不是长时间推导。",
    },
    "continue-frontier": {
      sessionShape: "继续当前学习前沿，不额外改变学习动作。",
    },
  };
  return copy[moveType] || copy["continue-frontier"];
}
