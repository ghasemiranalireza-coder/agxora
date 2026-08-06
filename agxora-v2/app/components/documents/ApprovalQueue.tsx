"use client";

import { useMemo, useState, type JSX } from "react";
import type { KnowledgeDocument } from "../../lib/documents";
import { formatDateTime } from "../../lib/documents";
import { Button, Card, EmptyState } from "../ui";
import { DocStatusBadge } from "./shared/StatusBadges";

export function ApprovalQueue({
  documents,
}: {
  readonly documents: readonly KnowledgeDocument[];
}): JSX.Element {
  const queue = useMemo(
    () => documents.filter((d) => d.status === "draft" || d.status === "in_review"),
    [documents],
  );
  const [notice, setNotice] = useState(
    "Approval transitions link to Automation architecture — no live workflow engine call.",
  );

  return (
    <Card className="space-y-3" padding="20px" hover={false}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Approval Workflow
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Draft → In Review → Approved / Rejected → Archived. Linked with Automation approval gates.
        </p>
      </div>

      {queue.length === 0 ? (
        <EmptyState title="Queue clear" description="No draft or in-review documents." />
      ) : (
        <ul className="space-y-2">
          {queue.map((doc) => (
            <li
              key={doc.id}
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {doc.name}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {doc.owner} · {formatDateTime(doc.updatedAt)} · {doc.department}
                  </p>
                </div>
                <DocStatusBadge status={doc.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    setNotice(`Approved ${doc.id} — Automation hook reserved.`)
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setNotice(`Rejected ${doc.id} — Automation hook reserved.`)
                  }
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setNotice(`Sent ${doc.id} to In Review via Automation architecture.`)
                  }
                >
                  Send to Review
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </Card>
  );
}
