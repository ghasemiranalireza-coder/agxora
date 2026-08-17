"use client";

import { useCallback, type JSX } from "react";
import {
  useOrganization,
  useWorkspaceDirectory,
} from "@/app/lib/organization";
import type { WorkspaceId } from "@/app/lib/organization/types";
import { useT } from "@/app/lib/i18n";
import { logWorkspaceSwitch } from "../services/iamOrgService";
import { useIamAuth } from "../hooks/useIamAuth";

/**
 * Workspace selector — architecture UI for multi-workspace switching.
 * Intentionally not mounted in Header/Sidebar (locked surfaces).
 */
export function WorkspaceSelector(): JSX.Element {
  const t = useT();
  const { organization } = useOrganization();
  const { workspaces, activeWorkspaceId, switchWorkspace } =
    useWorkspaceDirectory();
  const { userId } = useIamAuth();

  const onChange = useCallback(
    (workspaceId: string) => {
      void switchWorkspace(workspaceId as WorkspaceId);
      logWorkspaceSwitch({
        actorUserId: userId ?? undefined,
        organizationId: organization?.id,
        workspaceId,
      });
    },
    [organization?.id, switchWorkspace, userId],
  );

  if (!workspaces.length) {
    return (
      <p
        className="text-xs"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("iam.workspaceSelector.empty")}
      </p>
    );
  }

  return (
    <label
      className="block space-y-1.5 text-xs"
      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
    >
      {t("iam.workspaceSelector.label")}
      <select
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
        style={{
          borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
          background: "rgba(255,255,255,0.04)",
          color: "var(--agx-text, #f8fafc)",
        }}
        value={activeWorkspaceId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("iam.workspaceSelector.ariaLabel")}
      >
        {workspaces.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
