/**
 * Automation notifications — failed / completed / disabled / errors.
 */

import { automationStore } from "../store";
import type {
  AutomationNotification,
  AutomationNotificationKind,
} from "../types";

export function notifyWorkflowEvent(
  organizationId: string,
  kind: AutomationNotificationKind,
  content: {
    readonly title: string;
    readonly body: string;
    readonly workflowId?: string;
    readonly executionId?: string;
    readonly href?: string;
  },
): AutomationNotification {
  return automationStore.pushNotification({
    organizationId,
    kind,
    title: content.title,
    body: content.body,
    workflowId: content.workflowId,
    executionId: content.executionId,
    href: content.href,
  });
}

export function listAutomationNotifications(organizationId: string) {
  return automationStore.listNotifications(organizationId);
}

export function markAutomationNotificationRead(id: string): void {
  automationStore.markNotificationRead(id);
}
