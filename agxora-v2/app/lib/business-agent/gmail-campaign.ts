import "server-only";

import type { CampaignItem } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { recordExternalAction } from "@/app/lib/business-agent/audit";
import { executeGmailToolForActor } from "@/app/lib/business-agent/gmail-tools";

/**
 * Existing Gmail campaign send path, invoked by the Gmail adapter.
 * Approval, SAFE, and Gmail-confirmed message IDs stay in the current
 * production functions — this file only relocates the campaign item
 * persistence around that call.
 */
export async function executeGmailCampaignItemForActor(
  actor: Actor,
  item: CampaignItem,
): Promise<CampaignItem> {
  if (item.status !== "APPROVED") {
    await recordExternalAction({
      actor,
      provider: "email_gmail",
      action: "gmail.send_message",
      status: "approval_required",
      target: item.id,
      error: "approval_required",
    });
    throw new PersistenceError(
      "forbidden",
      "Sending Gmail requires explicit approval",
    );
  }

  await prisma.campaignItem.update({
    where: { id: item.id },
    data: { status: "PUBLISHING" },
  });
  await recordExternalAction({
    actor,
    provider: "email_gmail",
    action: "gmail.send_message",
    status: "executing",
    target: item.id,
  });

  try {
    const result = (await executeGmailToolForActor(actor, "gmail.send_message", {
      to: item.caption || undefined,
      subject: item.title,
      body: item.body,
      approved: true,
    })) as { id?: string; threadId?: string };

    const sentId = typeof result.id === "string" ? result.id : null;
    if (!sentId) {
      throw new PersistenceError(
        "validation",
        "Gmail did not confirm the send",
        { status: 502 },
      );
    }

    const published = await prisma.campaignItem.update({
      where: { id: item.id },
      data: {
        status: "PUBLISHED",
        externalId: sentId,
        error: null,
      },
    });
    await recordExternalAction({
      actor,
      provider: "email_gmail",
      action: "gmail.send_message",
      status: "completed",
      target: item.id,
      externalId: sentId,
      metadata: { threadId: result.threadId ?? null },
    });
    return published;
  } catch (error) {
    const message =
      error instanceof PersistenceError ? error.message : "Gmail send failed";
    await prisma.campaignItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: message,
        retryCount: { increment: 1 },
      },
    });
    throw error;
  }
}
