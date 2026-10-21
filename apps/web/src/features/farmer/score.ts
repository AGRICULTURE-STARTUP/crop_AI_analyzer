/** Farm Health Score runs from 300 to 850. */
export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

/** Where a score sits on the meter, 0–100. */
export const scorePercent = (score: number) =>
  Math.max(2, Math.min(100, ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100));
