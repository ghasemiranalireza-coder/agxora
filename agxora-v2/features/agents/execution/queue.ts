import type { ExecutionJob, ExecutionJobStatus } from "./jobs";
import { compareExecutionJobs } from "./jobs";

const OPEN_STATUSES: readonly ExecutionJobStatus[] = [
  "QUEUED",
  "WAITING_FOR_APPROVAL",
  "READY",
  "RUNNING",
  "VERIFYING",
  "RETRYING",
];

export function sortExecutionQueue(jobs: readonly ExecutionJob[]): ExecutionJob[] {
  return [...jobs].sort(compareExecutionJobs);
}

export function inspectExecutionQueue(
  jobs: readonly ExecutionJob[],
  organizationId: string,
): ExecutionJob[] {
  return sortExecutionQueue(
    jobs.filter(
      (job) =>
        job.organizationId === organizationId &&
        !job.paused &&
        OPEN_STATUSES.includes(job.status),
    ),
  );
}

export function countJobsByStatus(
  jobs: readonly ExecutionJob[],
  organizationId: string,
): Readonly<Record<string, number>> {
  const counts = {
    queued: 0,
    running: 0,
    waitingForApproval: 0,
    blocked: 0,
    failed: 0,
    completed: 0,
    cancelled: 0,
    verifying: 0,
    retrying: 0,
    ready: 0,
  };
  for (const job of jobs) {
    if (job.organizationId !== organizationId) continue;
    if (job.status === "QUEUED") counts.queued += 1;
    if (job.status === "RUNNING") counts.running += 1;
    if (job.status === "WAITING_FOR_APPROVAL") counts.waitingForApproval += 1;
    if (job.status === "BLOCKED") counts.blocked += 1;
    if (job.status === "FAILED") counts.failed += 1;
    if (job.status === "COMPLETED") counts.completed += 1;
    if (job.status === "CANCELLED") counts.cancelled += 1;
    if (job.status === "VERIFYING") counts.verifying += 1;
    if (job.status === "RETRYING") counts.retrying += 1;
    if (job.status === "READY") counts.ready += 1;
  }
  return counts;
}
