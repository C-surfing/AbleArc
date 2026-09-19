"use client";

import { useMemo, useState } from "react";
import { deriveReviewSuggestions } from "@/lib/learner-map-review";
import type { WorkspaceSnapshot } from "@/lib/types";
import styles from "./review-suggestions.module.css";

export function ReviewSuggestions({ snapshot }: { snapshot: WorkspaceSnapshot }) {
  const suggestions = useMemo(
    () => deriveReviewSuggestions(snapshot.reviewCandidates, snapshot.map),
    [snapshot.reviewCandidates, snapshot.map],
  );
  const [hidden, setHidden] = useState<Record<string, "skip" | "not_today">>({});
  const [activeId, setActiveId] = useState<string>();

  const visible = suggestions.filter((suggestion) => !hidden[suggestion.id]);
  if (suggestions.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="review-suggestions-title">
      <header className={styles.header}>
        <div>
          <span>Review suggestions</span>
          <h2 id="review-suggestions-title">Revisit what is worth retrieving.</h2>
        </div>
        <small>Optional · no scheduler</small>
      </header>

      <div className={styles.list}>
        {visible.length ? visible.map((suggestion) => (
          <article className={styles.card} key={suggestion.id}>
            <div>
              <strong>{suggestion.concept}</strong>
              <p>{suggestion.message}</p>
              <small>{suggestion.reason}</small>
            </div>
            {activeId === suggestion.id ? (
              <div className={styles.prompt}>
                <span>Try this from memory</span>
                <p>{suggestion.retrievalPrompt}</p>
              </div>
            ) : null}
            <footer>
              <button type="button" className={styles.primary} onClick={() => setActiveId(suggestion.id)}>
                Review now
              </button>
              <button type="button" onClick={() => setHidden((current) => ({ ...current, [suggestion.id]: "not_today" }))}>
                Not today
              </button>
              <button type="button" onClick={() => setHidden((current) => ({ ...current, [suggestion.id]: "skip" }))}>
                Skip
              </button>
            </footer>
          </article>
        )) : (
          <p className={styles.empty}>No review suggestion is foregrounded for the rest of this view.</p>
        )}
      </div>

      <p className={styles.boundary}>
        These choices only shape this page view. They do not schedule a due date, create Evidence, or change mastery.
      </p>
    </section>
  );
}
