/** Model probability as a readable percentage (">99%", "<1%", "73%"). */
export function formatConfidence(p: number) {
  if (p >= 0.995) return ">99%";
  if (p < 0.01) return "<1%";
  return `${Math.round(p * 100)}%`;
}
