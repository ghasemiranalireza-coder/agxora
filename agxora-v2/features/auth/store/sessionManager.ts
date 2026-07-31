/**
 * Session manager — access / refresh tokens, auto-refresh, timeout, idle placeholder.
 */

import { localAuthAdapter } from "@/app/lib/auth/LocalAuthAdapter";
import type { AuthSession } from "@/app/lib/auth/types";
import {
  DEFAULT_SESSION_POLICY,
  type IamSessionPolicy,
  type IamTokenPair,
} from "../types";
import { iamAuditLog } from "./auditStore";

type Listener = () => void;

interface SessionManagerState {
  readonly session: AuthSession | null;
  readonly lastActivityAt: number;
  readonly autoRefreshEnabled: boolean;
  readonly idleDetectionEnabled: boolean;
}

const listeners = new Set<Listener>();

let state: SessionManagerState = {
  session: null,
  lastActivityAt: Date.now(),
  autoRefreshEnabled: true,
  idleDetectionEnabled: false,
};

let policy: IamSessionPolicy = DEFAULT_SESSION_POLICY;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function emit(): void {
  listeners.forEach((l) => l());
}

function toTokenPair(session: AuthSession): IamTokenPair {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken ?? session.accessToken,
    expiresAt: session.expiresAt,
    tokenType: "Bearer",
  };
}

export const iamSessionManager = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): SessionManagerState {
    return state;
  },

  getPolicy(): IamSessionPolicy {
    return policy;
  },

  updatePolicy(patch: Partial<IamSessionPolicy>): IamSessionPolicy {
    policy = { ...policy, ...patch };
    emit();
    return policy;
  },

  setSession(session: AuthSession | null): void {
    state = {
      ...state,
      session,
      lastActivityAt: Date.now(),
    };
    emit();
  },

  touchActivity(): void {
    state = { ...state, lastActivityAt: Date.now() };
    emit();
  },

  /** Idle detection placeholder — enable when product policy requires it. */
  setIdleDetectionEnabled(enabled: boolean): void {
    state = { ...state, idleDetectionEnabled: enabled };
    emit();
  },

  setAutoRefreshEnabled(enabled: boolean): void {
    state = { ...state, autoRefreshEnabled: enabled };
    if (enabled) this.startAutoRefresh();
    else this.stopAutoRefresh();
    emit();
  },

  getTokenPair(): IamTokenPair | null {
    return state.session ? toTokenPair(state.session) : null;
  },

  isExpired(now = Date.now()): boolean {
    if (!state.session) return true;
    return new Date(state.session.expiresAt).getTime() <= now;
  },

  /** Returns true when idle timeout is configured and exceeded. */
  isIdleTimedOut(now = Date.now()): boolean {
    if (!state.idleDetectionEnabled || policy.idleTimeoutMs <= 0) return false;
    return now - state.lastActivityAt >= policy.idleTimeoutMs;
  },

  async refresh(): Promise<AuthSession | null> {
    const next = await localAuthAdapter.refreshSession();
    state = {
      ...state,
      session: next,
      lastActivityAt: Date.now(),
    };
    if (next) {
      iamAuditLog({
        action: "auth.session_refreshed",
        actorUserId: next.userId,
        resource: "session",
        resourceId: next.sessionId,
      });
    } else {
      iamAuditLog({
        action: "auth.session_expired",
        resource: "session",
      });
    }
    emit();
    return next;
  },

  startAutoRefresh(): void {
    if (typeof window === "undefined") return;
    this.stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (!state.autoRefreshEnabled || !state.session) return;
      const expiresAt = new Date(state.session.expiresAt).getTime();
      const remaining = expiresAt - Date.now();
      if (remaining <= policy.refreshSkewMs) {
        void this.refresh();
      }
    }, 60_000);
  },

  stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  },
};
