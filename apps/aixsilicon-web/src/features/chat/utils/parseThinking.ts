export interface ParsedThinking {
  thinking: string;
  content: string;
}

/** Extracts <think> blocks while keeping an unfinished block hidden. */
export function parseThinking(input: string): ParsedThinking {
  let thinking = '';
  let content = '';
  let cursor = 0;
  let thinkingStart = input.indexOf('<think>', cursor);

  while (thinkingStart >= 0) {
    content += input.slice(cursor, thinkingStart);
    const bodyStart = thinkingStart + '<think>'.length;
    const thinkingEnd = input.indexOf('</think>', bodyStart);
    if (thinkingEnd < 0) {
      thinking += input.slice(bodyStart);
      return { thinking, content };
    }
    thinking += input.slice(bodyStart, thinkingEnd);
    cursor = thinkingEnd + '</think>'.length;
    thinkingStart = input.indexOf('<think>', cursor);
  }

  content += input.slice(cursor);
  return { thinking, content };
}
