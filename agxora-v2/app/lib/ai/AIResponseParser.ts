/**
 * AIResponseParser — markdown / code / table / citation extraction.
 */

export interface ParsedCitation {
  readonly index: number;
  readonly label: string;
  readonly raw: string;
}

export interface ParsedCodeBlock {
  readonly language: string;
  readonly code: string;
}

export interface ParsedAIResponse {
  readonly text: string;
  readonly codeBlocks: readonly ParsedCodeBlock[];
  readonly citations: readonly ParsedCitation[];
  readonly hasMarkdown: boolean;
}

const CODE_BLOCK_RE = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
const CITATION_RE = /\[(\d+|source:[^\]]+)\]/g;

export class AIResponseParser {
  parse(content: string): ParsedAIResponse {
    const codeBlocks: ParsedCodeBlock[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(CODE_BLOCK_RE);
    while ((match = re.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || "text",
        code: match[2].replace(/\n$/, ""),
      });
    }

    const citations: ParsedCitation[] = [];
    const citeRe = new RegExp(CITATION_RE);
    let citeMatch: RegExpExecArray | null;
    let index = 0;
    while ((citeMatch = citeRe.exec(content)) !== null) {
      index += 1;
      citations.push({
        index,
        label: citeMatch[1],
        raw: citeMatch[0],
      });
    }

    const hasMarkdown =
      codeBlocks.length > 0 ||
      citations.length > 0 ||
      /(^|\n)\s{0,3}#{1,6}\s|(^|\n)\s*[-*+]\s|(^|\n)\s*\d+\.\s|\|.*\||\*\*[^*]+\*\*/m.test(
        content,
      );

    return {
      text: content,
      codeBlocks,
      citations,
      hasMarkdown,
    };
  }
}

export const aiResponseParser = new AIResponseParser();
