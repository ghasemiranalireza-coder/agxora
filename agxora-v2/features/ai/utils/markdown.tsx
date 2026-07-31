/**
 * Lightweight markdown renderer — no external deps.
 * Supports headings, lists, bold/italic, links, fenced code + basic highlighting.
 */

import {
  memo,
  useMemo,
  type JSX,
  type ReactNode,
} from "react";

type Block =
  | { kind: "code"; language: string; code: string }
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "paragraph"; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      i += 1;
      blocks.push({ kind: "code", language, code: codeLines.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1]!.length as 1 | 2 | 3,
        text: heading[2]!,
      });
      i += 1;
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !(lines[i] ?? "").startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i] ?? "") &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "")
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded px-1 py-0.5 text-[0.85em]"
          style={{
            background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)",
            color: "var(--agx-text, #f8fafc)",
          }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={key++}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
            style={{ color: "var(--agx-accent, #22d3ee)" }}
          >
            {link[1]}
          </a>,
        );
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Very light syntax highlight for common languages. */
function highlightCode(code: string, language: string): ReactNode {
  const lang = language.toLowerCase();
  if (!lang || lang === "text" || lang === "plain") {
    return code;
  }

  const keywordSets: Record<string, RegExp> = {
    js: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|typeof|interface|type)\b/g,
    ts: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|typeof|interface|type|extends|implements)\b/g,
    tsx: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|typeof|interface|type|extends|implements)\b/g,
    py: /\b(def|class|return|if|elif|else|for|while|import|from|as|with|try|except|async|await|True|False|None)\b/g,
    json: /\b(true|false|null)\b/g,
    sql: /\b(SELECT|FROM|WHERE|AND|OR|INSERT|UPDATE|DELETE|JOIN|ON|AS|LIMIT|ORDER|BY|GROUP)\b/gi,
  };

  const keywordRe =
    keywordSets[lang] ??
    keywordSets[lang === "javascript" ? "js" : lang === "typescript" ? "ts" : ""] ??
    null;

  if (!keywordRe) return code;

  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const re = new RegExp(keywordRe.source, keywordRe.flags);

  while ((match = re.exec(code)) !== null) {
    if (match.index > last) parts.push(code.slice(last, match.index));
    parts.push(
      <span
        key={key++}
        style={{ color: "var(--agx-accent, #22d3ee)", fontWeight: 600 }}
      >
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < code.length) parts.push(code.slice(last));
  return parts;
}

export interface MarkdownContentProps {
  readonly content: string;
  readonly className?: string;
}

function MarkdownContentInner({
  content,
  className,
}: MarkdownContentProps): JSX.Element {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div
      className={className}
      style={{ color: "var(--agx-text, #f8fafc)", lineHeight: 1.6, fontSize: 14 }}
    >
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const Tag = (`h${block.level}` as "h1" | "h2" | "h3");
          const sizes = { 1: "1.25rem", 2: "1.1rem", 3: "1rem" } as const;
          return (
            <Tag
              key={index}
              style={{
                fontSize: sizes[block.level],
                fontWeight: 600,
                margin: "0.75em 0 0.35em",
              }}
            >
              {renderInline(block.text)}
            </Tag>
          );
        }
        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={block.ordered ? "list-decimal" : "list-disc"}
              style={{ paddingLeft: "1.25rem", margin: "0.5em 0" }}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }
        if (block.kind === "code") {
          return (
            <CodeBlock
              key={index}
              language={block.language}
              code={block.code}
            />
          );
        }
        return (
          <p key={index} style={{ margin: "0.5em 0" }}>
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}): JSX.Element {
  return (
    <div
      className="my-2 overflow-hidden rounded-lg"
      style={{
        border: "1px solid color-mix(in srgb, var(--agx-border, #334155) 80%, transparent)",
        background: "color-mix(in srgb, var(--agx-bg-elevated, #0f172a) 92%, #000)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[11px] uppercase tracking-wider"
        style={{
          color: "var(--agx-text-muted, #94a3b8)",
          borderBottom:
            "1px solid color-mix(in srgb, var(--agx-border, #334155) 70%, transparent)",
        }}
      >
        <span>{language || "code"}</span>
        <button
          type="button"
          className="text-[11px] normal-case tracking-normal opacity-80 hover:opacity-100"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
          }}
        >
          Copy
        </button>
      </div>
      <pre
        className="overflow-x-auto p-3 text-[12.5px] leading-relaxed"
        style={{ margin: 0, color: "var(--agx-text, #e2e8f0)" }}
      >
        <code>{highlightCode(code, language)}</code>
      </pre>
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentInner);
