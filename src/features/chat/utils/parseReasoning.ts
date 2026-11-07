export interface ParsedReasoning {
  thinking: string;
  answer: string;
  /** True while a <think> block is opened but not yet closed (streaming). */
  isThinking: boolean;
}

const OPEN_TAG = '<think>';
const CLOSE_TAG = '</think>';

/**
 * Splits model output into reasoning ("<think>...</think>") and the visible answer.
 * Handles partially streamed content where the closing tag has not arrived yet.
 */
export function parseReasoning(raw: string): ParsedReasoning {
  if (!raw) return { thinking: '', answer: '', isThinking: false };

  const openIdx = raw.indexOf(OPEN_TAG);
  if (openIdx === -1) return { thinking: '', answer: raw, isThinking: false };

  const before = raw.slice(0, openIdx);
  const afterOpen = raw.slice(openIdx + OPEN_TAG.length);
  const closeIdx = afterOpen.indexOf(CLOSE_TAG);

  if (closeIdx === -1) {
    return { thinking: afterOpen.trim(), answer: before.trim(), isThinking: true };
  }

  const thinking = afterOpen.slice(0, closeIdx).trim();
  const answer = (before + afterOpen.slice(closeIdx + CLOSE_TAG.length)).trim();
  return { thinking, answer, isThinking: false };
}
