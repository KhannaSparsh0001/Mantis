export const CHARS_PER_TOKEN = 4;
export const TARGET_TOKENS = 300;
export const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;
export const OVERLAP_TOKENS = 50;
export const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

const PAGE_NUM_RE = /^\s*(page\s+\d+(\s*(of|[/])\s*\d+)?|\d+\s*[/]\s*\d+|\d+|-\d+-|\[\d+\])\s*$/i;
const SEPARATOR_RE = /^[\s\-_=*•·.]{3,}$/;
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const MULTI_NEWLINE_RE = /\n{4,}/g;
const MULTI_SPACE_RE = /[ \t]{3,}/g;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHARS_RE, '')
    .replace(MULTI_NEWLINE_RE, '\n\n\n')
    .replace(MULTI_SPACE_RE, '  ');
}

function stripBoilerplate(text: string): string {
  const lines = text.split('\n');
  const filtered: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (PAGE_NUM_RE.test(trimmed)) continue;
    if (SEPARATOR_RE.test(trimmed)) continue;
    filtered.push(line);
  }
  return filtered.join('\n').trim();
}

export function chunkText(
  text: string,
  pageNum: number,
  manualTitle?: string
): Array<{ text: string; page: number; chunkIndex: number }> {
  if (!text || !text.trim()) return [];

  const cleaned = cleanText(text);
  const cleanedTrimmed = cleaned.trim();
  if (!cleanedTrimmed) return [];

  const stripped = stripBoilerplate(cleaned);

  let finalText: string;
  if (stripped.length < cleanedTrimmed.length * 0.5 && cleanedTrimmed.length > 0) {
    console.warn(
      `[chunker] Over-stripping detected on page ${pageNum}${manualTitle ? ` (${manualTitle})` : ''}: ${stripped.length}/${cleanedTrimmed.length} chars. Using original.`
    );
    finalText = cleanedTrimmed;
  } else {
    finalText = stripped.length > 0 ? stripped : cleanedTrimmed;
  }

  if (!finalText) return [];

  const tokenCount = estimateTokens(finalText);
  if (tokenCount < TARGET_TOKENS) {
    return [{ text: finalText, page: pageNum, chunkIndex: 0 }];
  }

  const chunks: Array<{ text: string; page: number; chunkIndex: number }> = [];
  const step = TARGET_CHARS - OVERLAP_CHARS;
  let start = 0;

  while (start < finalText.length) {
    const end = Math.min(start + TARGET_CHARS, finalText.length);
    const chunkTextContent = finalText.slice(start, end).trim();
    if (chunkTextContent) {
      chunks.push({ text: chunkTextContent, page: pageNum, chunkIndex: chunks.length });
    }

    if (end >= finalText.length) break;

    start += step;

    const remaining = finalText.slice(start).trim();
    if (remaining.length <= OVERLAP_CHARS && remaining.length > 0) {
      chunks.push({ text: remaining, page: pageNum, chunkIndex: chunks.length });
      break;
    }
  }

  return chunks;
}
