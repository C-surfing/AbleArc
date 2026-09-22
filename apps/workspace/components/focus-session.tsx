"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DailyContext } from "@/lib/daily-context";
import { deriveDailyRecommendation } from "@/lib/daily-recommendation";
import { focusScaffolds, focusSessionMode, isFocusSessionWritable } from "@/lib/focus-session";
import { resolveLearnerUiLocale, uiMoveLabel, uiSessionShape, uiText } from "@/lib/ui-locale";
import type { WorkspaceSnapshot } from "@/lib/types";
import { LearningCanvas } from "./learning-canvas";
import styles from "./focus-session.module.css";

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function defaultTimerMinutes(context?: DailyContext): number {
  if (!context?.availableMinutes) return 25;
  return Math.max(5, Math.min(context.availableMinutes, 90));
}

export function FocusSession({
  snapshot,
  dailyContext,
  initialSupportVisible = false,
}: {
  snapshot: WorkspaceSnapshot;
  dailyContext?: DailyContext;
  initialSupportVisible?: boolean;
}) {
  const initialMinutes = useMemo(() => defaultTimerMinutes(dailyContext), [dailyContext]);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const [scaffoldLevel, setScaffoldLevel] = useState(0);
  const [supportVisible, setSupportVisible] = useState(initialSupportVisible);
  const locale = useMemo(
    () => resolveLearnerUiLocale(snapshot.preferredLanguage, [
      snapshot.mission,
      snapshot.frontier,
      snapshot.nextMove,
      snapshot.expectedLearnerAction,
      snapshot.latestExchange?.response,
    ]),
    [
      snapshot.preferredLanguage,
      snapshot.mission,
      snapshot.frontier,
      snapshot.nextMove,
      snapshot.expectedLearnerAction,
      snapshot.latestExchange?.response,
    ],
  );
  const t = (english: string, chinese: string) => uiText(locale, english, chinese);
  const recommendation = useMemo(
    () => deriveDailyRecommendation(snapshot, dailyContext),
    [snapshot, dailyContext],
  );
  const localizedShape = useMemo(
    () => uiSessionShape(locale, recommendation.moveType),
    [locale, recommendation.moveType],
  );
  const scaffolds = useMemo(() => focusScaffolds(snapshot, locale), [snapshot, locale]);
  const activeScaffold = scaffoldLevel > 0 ? scaffolds[Math.min(scaffoldLevel, scaffolds.length) - 1] : undefined;
  const scaffoldTarget = activeScaffold?.level === 1
    ? "prompt"
    : activeScaffold?.level === 2
      ? "attempt"
      : activeScaffold?.level === 3
        ? "representation"
        : "none";
  const writable = isFocusSessionWritable(snapshot);
  const mode = focusSessionMode(snapshot);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    setScaffoldLevel(0);
    setSupportVisible(initialSupportVisible);
  }, [snapshot.projectId, snapshot.decision?.id, initialSupportVisible]);

  function resetTimer() {
    setTimerRunning(false);
    setRemainingSeconds(initialMinutes * 60);
  }

  function revealScaffold() {
    const nextIndex = Math.min(scaffoldLevel, Math.max(scaffolds.length - 1, 0));
    const next = scaffolds[nextIndex];
    if (!next) return;

    setScaffoldLevel((current) => Math.min(current + 1, scaffolds.length));

    const selector = next.level === 1
      ? '[data-learning-object="prompt"]'
      : next.level === 2
        ? '[data-learning-object="attempt"]'
        : '[data-learning-object="interactive"], [data-learning-object="diagram"]';

    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    });
  }

  return (
    <div className={styles.focusPage} data-scaffold-target={scaffoldTarget}>
      <header className={styles.focusHeader}>
        <div className={styles.headerIdentity}>
          <Link href="/" aria-label={t("Back to Today", "返回今日")}>←</Link>
          <div>
            <strong>{snapshot.projectTitle || t("Current Project", "当前项目")}</strong>
            <small>{snapshot.frontier}</small>
          </div>
        </div>

        <div className={styles.headerCenter}>
          <span>{t("one move at a time", "一次只处理一个学习动作")}</span>
        </div>

        <div className={styles.headerActions}>
          <button
            className={`${styles.supportToggle} ${supportVisible ? styles.isActive : ""}`}
            type="button"
            aria-pressed={supportVisible}
            onClick={() => setSupportVisible((visible) => !visible)}
          >
            {supportVisible ? t("Hide support", "收起辅助") : t("Support", "辅助")}
          </button>
          {timerVisible ? (
            <div className={styles.timer} aria-label={t("Optional focus timer", "可选专注计时器")}>
              <strong aria-live="polite">{formatTimer(remainingSeconds)}</strong>
              <button type="button" onClick={() => setTimerRunning((running) => !running)} disabled={remainingSeconds === 0}>
                {timerRunning ? t("Pause", "暂停") : remainingSeconds === 0 ? t("Done", "完成") : t("Start", "开始")}
              </button>
              <button type="button" onClick={resetTimer}>{t("Reset", "重置")}</button>
              <button type="button" onClick={() => { resetTimer(); setTimerVisible(false); }}>{t("Hide", "隐藏")}</button>
            </div>
          ) : (
            <button className={styles.timerToggle} type="button" onClick={() => setTimerVisible(true)}>
              {locale === "zh" ? `计时 · ${initialMinutes} 分钟` : `Timer · ${initialMinutes}m`}
            </button>
          )}
          {snapshot.latestExchange?.status === "assessed" ? (
            <Link className={styles.workspaceLink} href="/close">{t("Close session", "结束本次学习")}</Link>
          ) : null}
          <Link className={styles.workspaceLink} href="/workspace">{t("Inspect", "检查")}</Link>
        </div>
      </header>

      {!writable ? (
        <section className={styles.lifecycleBanner}>
          <div>
            <strong>{t("This Project is read-only.", "当前项目为只读状态。")}</strong>
            <span>{t("Focus can show the current learning state, but the Runtime will not accept a new evidence-bearing response.", "这里仍可查看当前学习状态，但在项目恢复可写之前不会记录新的学习证据。")}</span>
          </div>
          <Link href="/workspace">{t("Manage lifecycle", "管理项目状态")}</Link>
        </section>
      ) : null}

      {!snapshot.decision ? (
        <section className={styles.lifecycleBanner}>
          <div>
            <strong>{t("No structured learning decision is ready.", "当前还没有可执行的学习动作。")}</strong>
            <span>{t("Use the Workspace to create or advance a Runtime-backed move before submitting evidence here.", "先在学习空间中准备下一步学习动作，再回到这里提交你的思考。")}</span>
          </div>
          <Link href="/workspace">{t("Open Workspace", "打开学习空间")}</Link>
        </section>
      ) : null}

      <div className={`${styles.focusBody} ${supportVisible ? styles.hasSupport : ""}`}>
        <div className={styles.canvasColumn}>
          <LearningCanvas snapshot={snapshot} mode={mode} locale={locale} variant="focus" />
          {snapshot.decision?.expectedEvidence ? (
            <aside className={styles.nextHint} aria-label={t("What this move unlocks", "这一步将解锁什么")}>
              <span>{t("After this move", "完成这一步后")}</span>
              <p>{snapshot.decision.expectedEvidence}</p>
            </aside>
          ) : null}
        </div>

        <aside className={`${styles.supportRail} ${supportVisible ? styles.isOpen : ""}`} aria-label={t("Focus Session support", "专注学习辅助区")}>
          <section className={styles.sessionShape}>
            <span>{t("Session shape", "本次学习节奏")}</span>
            <strong>{uiMoveLabel(locale, recommendation.moveType)}</strong>
            <p>{locale === "zh" ? localizedShape.sessionShape : recommendation.sessionShape}</p>
            {(locale === "zh" ? localizedShape.contextRationale : recommendation.contextRationale) ? <small>{locale === "zh" ? localizedShape.contextRationale : recommendation.contextRationale}</small> : null}
          </section>

          <section className={styles.scaffoldPanel}>
            <div className={styles.railHeading}>
              <span>{t("Scaffold", "提示支架")}</span>
              <small>{scaffoldLevel}/{scaffolds.length}</small>
            </div>
            <p className={styles.scaffoldIntro}>
              {t("Reveal only as much structure as you need. These prompts reuse the current learning boundaries; they do not supply the final answer.", "只展开你真正需要的结构。这些提示沿用当前学习边界，不会直接给出最终答案。")}
            </p>
            {scaffolds.slice(0, scaffoldLevel).map((scaffold) => (
              <div className={styles.scaffoldItem} key={scaffold.level}>
                <span>{scaffold.label}</span>
                <p>{scaffold.text}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={revealScaffold}
              disabled={scaffoldLevel >= scaffolds.length}
            >
              {scaffoldLevel === 0
                ? t("Need a scaffold", "需要一点提示")
                : scaffoldLevel >= scaffolds.length
                  ? t("All scaffolds revealed", "已展开全部提示")
                   : t("Reveal one more", "再展开一个提示")}
            </button>
          </section>

          <section className={styles.authorityNote}>
            <span>{t("Authority boundary", "状态边界")}</span>
            <p>{t("Timer and scaffold interactions are temporary UI context. They create no learning Evidence and cannot change mastery, the learning map, or Mission completion.", "计时器和提示交互只属于临时界面状态，不会自动形成学习证据，也不会改变掌握状态、学习地图或任务完成状态。")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
