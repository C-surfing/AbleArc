import assert from "node:assert/strict";
import test from "node:test";
import { resolveLearnerUiLocale, uiAssessmentFailure, uiMasteryState, uiMoveLabel, uiSessionShape, uiText } from "./ui-locale.ts";

test("explicit learner language wins over content-language fallback", () => {
  assert.equal(resolveLearnerUiLocale("Chinese", ["Bayes reasoning"]), "zh");
  assert.equal(resolveLearnerUiLocale("zh-CN", ["Bayes reasoning"]), "zh");
  assert.equal(resolveLearnerUiLocale("English", ["我正在学习贝叶斯"]), "en");
});

test("content language is only a fallback when no explicit preference exists", () => {
  assert.equal(resolveLearnerUiLocale(undefined, ["我正在学习贝叶斯"]), "zh");
  assert.equal(resolveLearnerUiLocale(undefined, ["Bayes reasoning"]), "en");
  assert.equal(resolveLearnerUiLocale(undefined, []), "en");
});

test("Focus chrome helpers stay locale-consistent", () => {
  assert.equal(uiText("zh", "Retry assessment", "重新评估"), "重新评估");
  assert.equal(uiText("en", "Retry assessment", "重新评估"), "Retry assessment");
  assert.equal(uiMoveLabel("zh", "frontier-deep-attempt"), "深入独立尝试");
  assert.equal(uiMoveLabel("en", "frontier-deep-attempt"), "frontier deep attempt");
});


test("Chinese Focus operational copy does not fall back to English", () => {
  assert.equal(uiSessionShape("zh", "frontier-short-retrieval").sessionShape.includes("提取"), true);
  assert.equal(uiAssessmentFailure("zh", "provider_timeout", "Provider timed out."), "模型评估超时。你的回答已经保存，可以直接重新评估。");
  assert.equal(uiMasteryState("zh", "exposed"), "已接触");
});
