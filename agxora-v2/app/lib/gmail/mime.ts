/**
 * RFC 2822 / Gmail raw message encoding (server-only).
 */

export function encodeRfc822Raw(input: {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly from?: string;
  readonly cc?: string;
  readonly inReplyTo?: string;
  readonly references?: string;
}): string {
  const headers = [
    `From: ${input.from?.trim() || "me"}`,
    `To: ${input.to.trim()}`,
  ];
  if (input.cc?.trim()) headers.push(`Cc: ${input.cc.trim()}`);
  headers.push(`Subject: ${encodeHeaderValue(input.subject)}`);
  if (input.inReplyTo?.trim()) {
    headers.push(`In-Reply-To: ${input.inReplyTo.trim()}`);
  }
  if (input.references?.trim()) {
    headers.push(`References: ${input.references.trim()}`);
  }
  headers.push("MIME-Version: 1.0");
  headers.push("Content-Type: text/plain; charset=UTF-8");
  const raw = `${headers.join("\r\n")}\r\n\r\n${input.body}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export type GmailHeaderMap = {
  readonly from: string;
  readonly to: string;
  readonly cc: string;
  readonly subject: string;
  readonly date: string;
  readonly messageId: string;
};

export function headersFromGmailPayload(
  headers: readonly { readonly name?: string; readonly value?: string }[] | undefined,
): GmailHeaderMap {
  const map = new Map<string, string>();
  for (const header of headers ?? []) {
    if (!header.name || header.value == null) continue;
    map.set(header.name.toLowerCase(), header.value);
  }
  return {
    from: map.get("from") ?? "",
    to: map.get("to") ?? "",
    cc: map.get("cc") ?? "",
    subject: map.get("subject") ?? "",
    date: map.get("date") ?? "",
    messageId: map.get("message-id") ?? "",
  };
}

type GmailPart = {
  readonly mimeType?: string;
  readonly body?: { readonly data?: string; readonly size?: number };
  readonly parts?: readonly GmailPart[];
};

function asGmailPart(value: unknown): GmailPart | null {
  if (!value || typeof value !== "object") return null;
  return value as GmailPart;
}

export function decodeGmailTextBody(payload: unknown): string {
  const part = asGmailPart(payload);
  if (!part) return "";
  const plain = findPart(part, "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  const html = findPart(part, "text/html");
  if (html?.body?.data) return stripHtml(decodeBase64Url(html.body.data));
  if (part.body?.data) return decodeBase64Url(part.body.data);
  return "";
}

function findPart(part: GmailPart, mimeType: string): GmailPart | null {
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
