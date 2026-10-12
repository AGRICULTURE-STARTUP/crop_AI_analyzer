/** Open the AgriBot widget from anywhere in the farmer portal, optionally with a draft question. */
export const AGRIBOT_OPEN_EVENT = "ukulimabora:open-agribot";

export function openAgriBot(message?: string) {
  window.dispatchEvent(
    new CustomEvent(AGRIBOT_OPEN_EVENT, { detail: { message } })
  );
}
