"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assessmentFailureLabel,
  assessmentFailureStorageKey,
  normalizeAssessmentFailureType,
  type AssessmentFailure,
} from "@/lib/focus-session";
import type { ArtifactInteraction, FrequencyTreeArtifact, WorkspaceSnapshot } from "@/lib/types";
import { uiAssessmentFailure, uiText, type LearnerUiLocale } from "@/lib/ui-locale";

type Mode = "Teach" | "Study" | "Map" | "Review";
type Representation = "artifact" | "structure" | "evidence" | "contrast" | "flow";

function representationLabel(locale: LearnerUiLocale, key: Representation): string {
  const english: Record<Representation, string> = {
    artifact: "Interactive",
    structure: "Structure",
    evidence: "Evidence",
    contrast: "Contrast",
    flow: "Flow",
  };
  const chinese: Record<Representation, string> = {
    artifact: "交互",
    structure: "结构",
    evidence: "证据",
    contrast: "对照",
    flow: "流程",
  };
  return locale === "zh" ? chinese[key] : english[key];
}

function modeLabel(locale: LearnerUiLocale, mode: Mode): string {
  if (locale !== "zh") return mode;
  return ({ Teach: "学习", Study: "复习", Map: "地图", Review: "回顾" } as const)[mode];
}

function FrequencyTreeArtifactView({
  artifact,
  onInteractionChange,
  locale,
}: {
  artifact: FrequencyTreeArtifact;
  onInteractionChange: (interaction: ArtifactInteraction) => void;
  locale: LearnerUiLocale;
}) {
  const t = (english: string, chinese: string) => uiText(locale, english, chinese);
  const model = artifact.payload;
  const [prevalence, setPrevalence] = useState(model.prevalence);
  const [predictionId, setPredictionId] = useState<string>();
  const conditionCount = model.population * prevalence;
  const complementCount = model.population - conditionCount;
  const truePositiveCount = conditionCount * model.sensitivity;
  const falsePositiveCount = complementCount * model.falsePositiveRate;
  const positiveCount = truePositiveCount + falsePositiveCount;
  const posterior = positiveCount === 0 ? 0 : truePositiveCount / positiveCount;
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

  function commitPrediction(optionId: string) {
    setPredictionId(optionId);
    onInteractionChange({
      artifactId: artifact.id,
      predictionId: optionId,
      initialPrevalence: model.prevalence,
      finalPrevalence: prevalence,
    });
  }

  function changePrevalence(value: number) {
    setPrevalence(value);
    if (predictionId) {
      onInteractionChange({
        artifactId: artifact.id,
        predictionId,
        initialPrevalence: model.prevalence,
        finalPrevalence: value,
      });
    }
  }

  return (
    <div className="artifact" aria-label={artifact.title}>
      <header className="artifact__header">
        <div>
          <span className="section-kicker">{t("Interactive learning artifact", "交互式学习表示")}</span>
          <h3>{artifact.title}</h3>
        </div>
        <span className="artifact__type">{t("frequency tree", "频率树")}</span>
      </header>
      <p className="artifact__goal">{artifact.learningGoal}</p>

      <section className="artifact-prediction" aria-labelledby={`prediction-${artifact.id}`}>
        <span>{t("Predict before reveal", "先预测，再揭示")}</span>
        <p id={`prediction-${artifact.id}`}>{artifact.prediction.prompt}</p>
        <div className="artifact-prediction__options">
          {artifact.prediction.options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={predictionId === option.id}
              className={predictionId === option.id ? "is-selected" : ""}
              onClick={() => commitPrediction(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {predictionId ? (
        <>
          <label className="artifact-control" htmlFor={`prevalence-${artifact.id}`}>
            <div>
              <span>{t("Base rate / prevalence", "基准率 / 患病率")}</span>
              <strong>{percent.format(prevalence)}</strong>
            </div>
            <input
              id={`prevalence-${artifact.id}`}
              type="range"
              min={model.prevalenceMin}
              max={model.prevalenceMax}
              step={model.prevalenceStep}
              value={prevalence}
              onChange={(event) => changePrevalence(Number(event.target.value))}
            />
          </label>

          <div className="artifact-population" aria-live="polite">
            <div className="artifact-population__root">
              <span>{t("Reference population", "参考总体")}</span>
              <strong>{number.format(model.population)} {model.labels.population}</strong>
            </div>
            <div className="artifact-branches">
              <div>
                <span>{model.labels.condition}</span>
                <strong>{number.format(conditionCount)}</strong>
                <small>{percent.format(model.sensitivity)} {t("sensitivity", "敏感度")} → {number.format(truePositiveCount)} {model.labels.positive}</small>
              </div>
              <div>
                <span>{model.labels.complement}</span>
                <strong>{number.format(complementCount)}</strong>
                <small>{percent.format(model.falsePositiveRate)} {t("false-positive rate", "假阳性率")} → {number.format(falsePositiveCount)} {model.labels.falsePositive}</small>
              </div>
            </div>
          </div>

          <div className="artifact-result">
            <div>
              <span>{t("positive results", "阳性结果")}</span>
              <strong>{number.format(truePositiveCount)} + {number.format(falsePositiveCount)}</strong>
            </div>
            <div className="artifact-result__posterior">
              <span>{t("posterior after a positive result", "阳性后的后验概率")}</span>
              <strong>{percent.format(posterior)}</strong>
            </div>
          </div>

          <div className="artifact-prompt">
            <span>{t("Now infer", "现在推断")}</span>
            <p>{artifact.inferencePrompt}</p>
            <small>{t("Evidence target", "证据目标")}: {artifact.successEvidence}</small>
          </div>
        </>
      ) : (
        <div className="artifact-locked">
          <strong>{t("Commit a prediction to unlock the population.", "先提交一个预测，再展开总体数据。")}</strong>
          <span>{t("Your choice is context for the tutor, not an automatic grade.", "你的选择只是教学上下文，不会被自动当作成绩或掌握证据。")}</span>
        </div>
      )}
    </div>
  );
}

function StructureView({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  return (
    <div className="structure-strip">
      {snapshot.map.nodes.slice(0, 5).map((node, index) => (
        <div className="structure-step" key={node.id}>
          <span className={`state-mark state-mark--${node.state}`}>{node.state === "transferable" ? "◆" : node.state === "stable" ? "●" : node.state === "developing" ? "◐" : node.state === "exposed" ? "◔" : "○"}</span>
          <span>{node.label}</span>
          {index < Math.min(snapshot.map.nodes.length, 5) - 1 ? <span className="structure-arrow">→</span> : null}
        </div>
      ))}
    </div>
  );
}

function EvidenceView({ snapshot, locale }: { snapshot: WorkspaceSnapshot; locale: LearnerUiLocale }) {
  const t = (english: string, chinese: string) => uiText(locale, english, chinese);
  const levels = ["recognition", "recall", "explanation", "application", "transfer"];
  const strongest = snapshot.evidence.reduce((max, item) => Math.max(max, levels.indexOf(item.level)), -1);
  return (
    <div className="evidence-canvas">
      <div className="evidence-ladder evidence-ladder--large">
        {levels.map((level, index) => (
          <div key={level} className={`evidence-rung ${index <= strongest ? "is-observed" : ""}`}>
            <span>{index + 1}</span>
            <strong>{locale === "zh" ? ({ recognition: "识别", recall: "提取", explanation: "解释", application: "应用", transfer: "迁移" } as Record<string, string>)[level] : level}</strong>
            <small>{index <= strongest ? t("supported", "已有支持") : t("not yet verified", "尚未验证")}</small>
          </div>
        ))}
      </div>
      {snapshot.evidence.length === 0 ? <p className="empty-copy">{t("No decisive evidence has been recorded yet.", "目前还没有足够明确的学习证据。")}</p> : null}
    </div>
  );
}

function ContrastView({ snapshot, locale }: { snapshot: WorkspaceSnapshot; locale: LearnerUiLocale }) {
  const t = (english: string, chinese: string) => uiText(locale, english, chinese);
  return (
    <div className="contrast-grid">
      <div className="contrast-card">
        <span>{t("Current friction", "当前卡点")}</span>
        <strong>{snapshot.frontierReason}</strong>
      </div>
      <div className="contrast-divider">→</div>
      <div className="contrast-card contrast-card--target">
        <span>{t("Next independent action", "下一步独立行动")}</span>
        <strong>{snapshot.expectedLearnerAction}</strong>
      </div>
    </div>
  );
}

function FlowView({ snapshot, locale }: { snapshot: WorkspaceSnapshot; locale: LearnerUiLocale }) {
  const steps = locale === "zh"
    ? [
        ["模型", snapshot.frontier],
        ["动作", snapshot.nextMove],
        ["你的行动", snapshot.expectedLearnerAction],
        ["证据", "确认、保留或修正当前学习者模型"],
      ]
    : [
        ["MODEL", snapshot.frontier],
        ["MOVE", snapshot.nextMove],
        ["LEARNER ACTS", snapshot.expectedLearnerAction],
        ["EVIDENCE", "Confirm, preserve, or revise the learner model"],
      ];
  return (
    <div className="cognitive-flow">
      {steps.map(([label, value], index) => (
        <div className="cognitive-flow__row" key={label}>
          <div className="cognitive-flow__label">{label}</div>
          <div className="cognitive-flow__value">{value}</div>
          {index < steps.length - 1 ? <div className="cognitive-flow__line" /> : null}
        </div>
      ))}
    </div>
  );
}

export function LearningCanvas({
  snapshot,
  mode,
  locale = "en",
}: {
  snapshot: WorkspaceSnapshot;
  mode: Mode;
  locale?: LearnerUiLocale;
}) {
  const t = (english: string, chinese: string) => uiText(locale, english, chinese);
  const router = useRouter();
  const [representation, setRepresentation] = useState<Representation>(snapshot.artifact ? "artifact" : "structure");
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [submitted, setSubmitted] = useState(snapshot.decision?.hasLearnerResponse ?? false);
  const [submitError, setSubmitError] = useState<string>();
  const [assessmentError, setAssessmentError] = useState<AssessmentFailure>();
  const [artifactInteraction, setArtifactInteraction] = useState<ArtifactInteraction>();
  const [missionTitle, setMissionTitle] = useState("");
  const [missionGoal, setMissionGoal] = useState("");
  const [missionContext, setMissionContext] = useState("");
  const [missionError, setMissionError] = useState<string>();
  const [isStartingMission, setIsStartingMission] = useState(false);
  const projectWritable = snapshot.projectStatus === undefined
    || snapshot.projectStatus === "active"
    || (
      snapshot.projectStatus === "archived"
      && snapshot.maintenanceStatus === "study_active"
    );
  const assessmentStorageKey = useMemo(
    () => snapshot.decision?.id
      ? assessmentFailureStorageKey(snapshot.projectId || "workspace", snapshot.decision.id)
      : undefined,
    [snapshot.projectId, snapshot.decision?.id],
  );
  useEffect(() => {
    setSubmitted(snapshot.decision?.hasLearnerResponse ?? false);
    setResponse("");
    setSubmitError(undefined);
    setIsAssessing(false);
    setArtifactInteraction(undefined);

    if (!assessmentStorageKey) {
      setAssessmentError(undefined);
      return;
    }
    if (snapshot.latestExchange?.status === "assessed") {
      window.localStorage.removeItem(assessmentStorageKey);
      setAssessmentError(undefined);
      return;
    }
    try {
      const stored = window.localStorage.getItem(assessmentStorageKey);
      if (!stored) {
        setAssessmentError(undefined);
        return;
      }
      const parsed = JSON.parse(stored) as { type?: unknown; message?: unknown };
      if (typeof parsed.message !== "string" || !parsed.message.trim()) {
        window.localStorage.removeItem(assessmentStorageKey);
        setAssessmentError(undefined);
        return;
      }
      setAssessmentError({
        type: normalizeAssessmentFailureType(parsed.type),
        message: parsed.message,
      });
    } catch {
      window.localStorage.removeItem(assessmentStorageKey);
      setAssessmentError(undefined);
    }
  }, [
    assessmentStorageKey,
    snapshot.decision?.id,
    snapshot.decision?.hasLearnerResponse,
    snapshot.latestExchange?.status,
  ]);
  useEffect(() => {
    setRepresentation(snapshot.artifact ? "artifact" : "structure");
  }, [snapshot.artifact?.id]);
  const availableRepresentations = useMemo<Representation[]>(() => (
    snapshot.artifact
      ? ["artifact", "structure", "evidence", "contrast", "flow"]
      : ["structure", "evidence", "contrast", "flow"]
  ), [snapshot.artifact]);
  const modeCopy = useMemo(() => {
    if (mode === "Study") return t(
      "Retrieve first. Repair only what fails, then apply or transfer.",
      "先尝试提取已有理解；只修复真正失败的部分，再进入应用或迁移。",
    );
    if (mode === "Map") return t(
      "Inspect the dependency hypothesis without turning the graph into a progress score.",
      "检查知识依赖假设，但不要把学习地图当成简单的进度分数。",
    );
    if (mode === "Review") return t(
      "Choose a high-value retrieval target from current evidence and dependency relevance.",
      "根据已有证据与依赖关系，选择最值得重新提取的内容。",
    );
    return t(
      "Grow the model through one reachable cognitive move, then verify what changed.",
      "一次只推进一个可完成的认知动作，再用真实表现验证发生了什么变化。",
    );
  }, [locale, mode]);
  let composerMessage = t("Your response stays in the local learning workspace", "你的回答会保存在本地学习空间中");
  if (!projectWritable) {
    composerMessage = t("This Project is read-only in its current lifecycle state", "当前项目为只读状态，暂时不能记录新的学习证据");
  } else if (isAssessing) {
    composerMessage = locale === "zh" ? `回答已保存 · 正在使用 ${snapshot.agent.model || "已配置模型"} 评估…` : `Your response is saved locally · Assessing with ${snapshot.agent.model || "the configured Provider"}…`;
  } else if (assessmentError) {
    composerMessage = locale === "zh" ? `回答已保存 · ${uiAssessmentFailure(locale, assessmentError.type, assessmentError.message)}` : `Your response is saved locally · ${assessmentFailureLabel(assessmentError.type)}: ${assessmentError.message}`;
  } else if (submitted && snapshot.agent.configured) {
    composerMessage = locale === "zh" ? `已保存 · ${snapshot.agent.model} 可以开始评估` : `Saved locally · ${snapshot.agent.model} is ready to assess`;
  } else if (submitted && snapshot.agent.error) {
    composerMessage = snapshot.agent.error;
  } else if (submitted) {
    composerMessage = t("Saved locally · continue with an external Agent", "已保存 · 可继续使用外部 Agent 评估");
  } else if (snapshot.artifact && !artifactInteraction) {
    composerMessage = t("Commit a prediction in the artifact before submitting", "提交前先在交互表示中做出预测");
  }

  function rememberAssessmentFailure(failure: AssessmentFailure) {
    setAssessmentError(failure);
    if (assessmentStorageKey) {
      window.localStorage.setItem(assessmentStorageKey, JSON.stringify(failure));
    }
  }

  async function assessPendingResponse(decisionId: string) {
    if (isAssessing || !snapshot.agent.configured || !decisionId) return;
    setIsAssessing(true);
    setAssessmentError(undefined);
    try {
      const result = await fetch("/api/learning/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisionId }),
      });
      const payload = await result.json() as { error?: string; errorType?: unknown };
      if (!result.ok) {
        rememberAssessmentFailure({
          type: normalizeAssessmentFailureType(payload.errorType),
          message: payload.error || t("Could not assess the saved response.", "未能评估已保存的回答。"),
        });
        return;
      }
      if (assessmentStorageKey) window.localStorage.removeItem(assessmentStorageKey);
      setAssessmentError(undefined);
      router.refresh();
    } catch (error) {
      rememberAssessmentFailure({
        type: "network",
        message: error instanceof Error ? error.message : t("Could not reach the assessment endpoint.", "无法连接评估服务。"),
      });
    } finally {
      setIsAssessing(false);
    }
  }

  async function submitLearnerResponse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !snapshot.decision
      || !response.trim()
      || isSubmitting
      || submitted
      || !projectWritable
      || (snapshot.artifact && !artifactInteraction)
    ) return;
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const result = await fetch("/api/learning/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisionId: snapshot.decision.id, response, artifactInteraction }),
      });
      const payload = await result.json() as { error?: string };
      if (!result.ok) throw new Error(locale === "zh" ? "未能保存你的回答。" : (payload.error || "Could not save your response."));
      setSubmitted(true);
      setResponse("");
      if (snapshot.agent.configured) {
        await assessPendingResponse(snapshot.decision.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      setSubmitError(locale === "zh" ? "未能保存你的回答，请重试。" : (error instanceof Error ? error.message : "Could not save your response."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startMission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!missionGoal.trim() || isStartingMission || snapshot.hasMission) return;
    setIsStartingMission(true);
    setMissionError(undefined);
    try {
      const result = await fetch("/api/learning/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: missionTitle, goal: missionGoal, context: missionContext }),
      });
      const payload = await result.json() as { error?: string };
      if (!result.ok) throw new Error(locale === "zh" ? "未能开始学习任务。" : (payload.error || "Could not start the learning mission."));
      router.refresh();
    } catch (error) {
      setMissionError(locale === "zh" ? "未能开始学习任务，请重试。" : (error instanceof Error ? error.message : "Could not start the learning mission."));
    } finally {
      setIsStartingMission(false);
    }
  }

  return (
    <main className="learning-canvas-panel">
      {snapshot.sessionBrief ? (
        <section className="session-brief" aria-label={t("Session brief", "本次学习摘要")}>
          <span>{locale === "zh" ? "本次学习" : snapshot.sessionBrief.label}</span>
          <div>
            <strong>{locale === "zh" ? snapshot.frontier : snapshot.sessionBrief.title}</strong>
            <p>{locale === "zh"
              ? (snapshot.latestExchange?.status === "awaiting_assessment"
                ? "你的回答已经保存，先完成评估，不需要重复作答。"
                : snapshot.expectedLearnerAction)
              : snapshot.sessionBrief.detail}</p>
          </div>
        </section>
      ) : null}
      <header className="canvas-header">
        <div>
          <div className="eyebrow-row">
            <span className="mode-chip">{modeLabel(locale, mode)}</span>
            <span className="source-chip">{snapshot.source === "local" ? t("LOCAL STATE", "本地状态") : t("DEMO SNAPSHOT", "演示快照")}</span>
            <span className={`provider-chip ${snapshot.agent.configured ? "is-ready" : ""}`}>
              {snapshot.agent.configured
                ? `${t("MODEL", "模型")} · ${snapshot.agent.model}`
                : snapshot.agent.error
                  ? t("MODEL CONFIG ERROR", "模型配置错误")
                   : t("EXTERNAL AGENT", "外部 AGENT")}
            </span>
          </div>
          <h1>{snapshot.hasMission ? snapshot.frontier : t("What do you want to become able to do?", "你希望自己最终能够做到什么？")}</h1>
          <p>{snapshot.hasMission
            ? modeCopy
            : t("Start with an observable capability. The learning map and first move should be built from your goal, not invented before you arrive.", "从一个可以观察到的能力开始。学习地图和第一步应该从你的目标中长出来，而不是预先替你编好。")}</p>
        </div>
      </header>

      {!snapshot.hasMission ? (
        <form className="mission-start" onSubmit={startMission}>
          <div className="mission-start__intro">
            <span className="section-kicker">{t("Start a learning mission", "开始一个学习任务")}</span>
            <h2>{t("Describe the capability, not just the topic.", "描述你想获得的能力，而不只是一个主题。")}</h2>
            <p>{t("For example: “Read an empirical ML paper and challenge its causal claims,” not only “learn machine learning.”", "例如：“能读懂一篇实证机器学习论文并质疑它的因果主张”，而不只是“学习机器学习”。")}</p>
          </div>
          <label>
            <span>{t("Project name", "项目名称")} <small>{t("optional", "可选")}</small></span>
            <input
              value={missionTitle}
              onChange={(event) => setMissionTitle(event.target.value)}
              maxLength={200}
              placeholder={t("A short name for this learning line", "给这条学习主线起一个简短名称")}
            />
          </label>
          <label>
            <span>{t("I want to become able to", "我希望自己能够")}</span>
            <textarea
              value={missionGoal}
              onChange={(event) => setMissionGoal(event.target.value)}
              maxLength={1200}
              rows={3}
              required
              placeholder={t("What should you be able to explain, build, derive, decide, or transfer?", "你最终希望能够解释、构建、推导、判断或迁移什么？")}
            />
          </label>
          <label>
            <span>{t("Why now?", "为什么现在学？")} <small>{t("optional", "可选")}</small></span>
            <textarea
              value={missionContext}
              onChange={(event) => setMissionContext(event.target.value)}
              maxLength={2400}
              rows={2}
              placeholder={t("A project, deadline, curiosity, or practical constraint that should shape the route.", "项目、截止日期、好奇心或现实约束，都可以影响学习路线。")}
            />
          </label>
          <div className="mission-start__footer">
            <span aria-live="polite">{missionError || t("Saved locally. No learner model or mastery claim is created yet.", "会保存在本地；此时还不会产生学习者模型或掌握状态判断。")}</span>
            <button type="submit" disabled={!missionGoal.trim() || isStartingMission}>
              {isStartingMission ? t("Starting…", "正在开始…") : t("Start learning mission", "开始学习")}
            </button>
          </div>
        </form>
      ) : (
      <section className="teacher-move" aria-labelledby="move-title">
        <div className="teacher-move__meta">
          <span>{t("Next step", "下一步")}</span>
          <span className="thin-rule" />
          <span>{t("one useful thing at a time", "一次只做一件真正有用的事")}</span>
        </div>
        <h2 id="move-title">{snapshot.nextMove}</h2>
        <div className="learner-action">
          <span>{t("Your move", "轮到你")}</span>
          <p>{snapshot.expectedLearnerAction}</p>
        </div>
        {null}
      </section>
      )}

      {snapshot.latestExchange?.status === "assessed" ? (
        <section className="feedback-card" aria-labelledby="feedback-title">
          <div className="feedback-card__header">
            <div>
              <span className="section-kicker">{t("From your last response", "来自你上一次回答")}</span>
              <strong id="feedback-title">{t("Feedback", "反馈")}</strong>
            </div>
          </div>
          <p className="feedback-card__response">“{snapshot.latestExchange.response}”</p>
          <p className="feedback-card__message">{snapshot.latestExchange.feedback}</p>
          {snapshot.latestExchange.nextDecisionId === snapshot.decision?.id ? (
            <div className="feedback-card__meta"><span>{t("Next step ready", "下一步已准备好")}</span></div>
          ) : null}
        </section>
      ) : null}

      {snapshot.latestExchange?.status === "assessed"
      && snapshot.latestExchange.evidenceId
      && snapshot.latestStateDecision?.decision === "accepted"
      && snapshot.latestStateDecision.evidenceIds.includes(snapshot.latestExchange.evidenceId) ? (
        <section className="feedback-card" aria-label={t("Learning state updated", "学习状态已更新")}>
          <div className="feedback-card__header">
            <div>
              <span className="section-kicker">{t("Learning state updated", "学习状态已更新")}</span>
              <strong>{snapshot.latestStateDecision.concept}</strong>
            </div>
          </div>
          <p className="feedback-card__message">
            {snapshot.latestStateDecision.before} → {snapshot.latestStateDecision.after}{t(". This accepted update is grounded in the assessed response; first exposure is not treated as stable mastery.", "。这次更新基于刚才评估过的真实表现；首次接触不会被当作稳定掌握。")}
          </p>
        </section>
      ) : snapshot.latestExchange?.status === "assessed" && snapshot.pendingStateProposalCount > 0 ? (
        <section className="feedback-card" aria-label={t("Learning state update ready for review", "学习状态更新待审核")}>
          <div className="feedback-card__header">
            <div>
              <span className="section-kicker">{t("Learning state review", "学习状态审核")}</span>
              <strong>{t("An evidence-backed update is waiting for your review", "有一项基于证据的状态更新等待你确认")}</strong>
            </div>
          </div>
          <p className="feedback-card__message">
            {t("Your accepted learning state has not changed yet. Review the evidence-backed update before deciding whether it is justified.", "当前已接受的学习状态还没有改变。请先查看证据，再决定这项更新是否合理。")}
          </p>
          <div className="feedback-card__meta">
            <Link href="/workspace">{t("Review learning state", "审核学习状态")}</Link>
          </div>
        </section>
      ) : null}

      {!snapshot.hasMission ? (
        <div className="demo-preview-note">
          <span>{t("Example workspace", "示例学习空间")}</span>
          <p>{t("The representation below is a clearly labeled preview, not your learner state.", "下面的表示只是明确标注的预览，不代表你的真实学习状态。")}</p>
        </div>
      ) : null}

      <section className="representation-card">
        <div className="representation-toolbar">
          <div>
            <span className="section-kicker">{t("Representation", "表示方式")}</span>
            <strong>{t("Use the view that exposes the relation", "选择最能暴露关系的视图")}</strong>
          </div>
          <div className="segmented-control" role="tablist" aria-label={t("Representation switcher", "表示方式切换")}>
            {availableRepresentations.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={representation === key}
                className={representation === key ? "is-active" : ""}
                onClick={() => setRepresentation(key)}
              >
                {representationLabel(locale, key)}
              </button>
            ))}
          </div>
        </div>
        <div className="representation-stage">
          {representation === "artifact" && snapshot.artifact ? (
            <FrequencyTreeArtifactView
              key={snapshot.artifact.id}
              artifact={snapshot.artifact}
              onInteractionChange={setArtifactInteraction}
            />
          ) : null}
          {representation === "structure" ? <StructureView snapshot={snapshot} /> : null}
          {representation === "evidence" ? <EvidenceView snapshot={snapshot} locale={locale} /> : null}
          {representation === "contrast" ? <ContrastView snapshot={snapshot} locale={locale} /> : null}
          {representation === "flow" ? <FlowView snapshot={snapshot} locale={locale} /> : null}
        </div>
        <footer className="representation-footer">
          <span>{t("READ", "阅读")}</span><span>·</span><span>{t("PREDICT", "预测")}</span><span>·</span><span>{t("RECONSTRUCT", "重构")}</span><span>·</span><span>{t("TRANSLATE", "转译")}</span>
        </footer>
      </section>

      {snapshot.hasMission ? (
      <form className={`composer-shell ${submitted ? "is-submitted" : ""}`} onSubmit={submitLearnerResponse}>
        <label className="composer-prompt" htmlFor="learner-response">
          <span className="composer-mark">↳</span>
          <textarea
            id="learner-response"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            disabled={!snapshot.decision || submitted || isSubmitting || !projectWritable}
            maxLength={12000}
            rows={3}
            placeholder={submitted
              ? t("Response saved. The tutor will use it as evidence for the next move.", "回答已保存。系统会基于它评估并决定下一步。")
              : !projectWritable
                ? t("Resume this Project or start an archived maintenance review before adding evidence.", "先恢复这个项目，或开始归档项目的维护复习，再记录新的学习证据。")
              : snapshot.decision
                ? t("Write what you think. Partial reasoning is completely fine.", "写下你真实的想法即可，不完整的推理也完全可以。")
                 : t("Start a Teach or Study turn to respond here.", "先开始一个学习或复习动作，再在这里回答。")}
          />
        </label>
        <div className="composer-status">
          <span aria-live="polite">
            {submitError || composerMessage}
          </span>
          <div className="composer-actions">
            {submitted && snapshot.latestExchange?.status !== "assessed" ? (
              <button
                className="composer-refresh"
                type="button"
                disabled={isAssessing}
                onClick={() => snapshot.agent.configured
                  ? assessPendingResponse(snapshot.latestExchange?.decisionId || snapshot.decision?.id || "")
                  : router.refresh()}
              >
                {isAssessing
                  ? t("Assessing…", "正在评估…")
                  : snapshot.agent.configured
                    ? assessmentError
                      ? t("Retry assessment", "重新评估")
                       : (locale === "zh" ? `使用 ${snapshot.agent.model} 评估` : `Assess with ${snapshot.agent.model}`)
                     : t("Check feedback", "检查反馈")}
              </button>
            ) : null}
            {assessmentError ? (
              <Link
                className="composer-refresh"
                href="/workspace"
                title={t("The saved response remains available to the Workspace and external Agent path.", "已保存的回答仍可在学习空间或外部 Agent 路径中继续处理。")}
              >
                {t("Open Workspace", "打开学习空间")}
              </Link>
            ) : null}
            <button
              type="submit"
              disabled={!snapshot.decision || !response.trim() || submitted || isSubmitting || isAssessing || !projectWritable || Boolean(snapshot.artifact && !artifactInteraction)}
            >
              {isSubmitting
                ? t("Saving…", "正在保存…")
                : submitted
                  ? t("Response saved", "回答已保存")
                  : snapshot.artifact && !artifactInteraction
                    ? t("Predict first", "先做预测")
                     : t("Send", "发送")}
            </button>
          </div>
        </div>
      </form>
      ) : null}
    </main>
  );
}
