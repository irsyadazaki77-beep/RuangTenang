export interface DocumentOutlineItem {
  /** Zero-based index among rendered h1–h3 headings, used to locate the DOM node. */
  index: number;
  level: 1 | 2 | 3;
  text: string;
}

const HEADING_PATTERN = /^(#{1,3})\s+(.+?)\s*#*\s*$/;
const FENCE_PATTERN = /^\s*(```|~~~)/;

/**
 * Extracts h1–h3 markdown headings for the canvas outline navigator.
 * Headings inside fenced code blocks are ignored so the index stays aligned
 * with the headings actually rendered in the preview.
 */
export function extractDocumentOutline(markdown: string, maxItems = 60): DocumentOutlineItem[] {
  const items: DocumentOutlineItem[] = [];
  if (!markdown) return items;

  let fence: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = line.match(FENCE_PATTERN);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1];
      else if (fence === fenceMatch[1]) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const match = line.match(HEADING_PATTERN);
    if (!match) continue;
    const text = match[2].replace(/[*_`]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
    if (!text) continue;
    items.push({ index: items.length, level: match[1].length as 1 | 2 | 3, text });
    if (items.length >= maxItems) break;
  }
  return items;
}
