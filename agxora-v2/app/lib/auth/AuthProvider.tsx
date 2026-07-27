"use client";

/**
 * AuthProvider — centralized authentication + user context.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { asUserId, type UserId } from "../organization/types";
import {
  createAuthAdapter,
  localAuthAdapter,
} from "./LocalAuthAdapter";
import type {
  AuthProviderPort,
  AuthSession,
  AuthState,
  AuthUser,
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
  VerifyEmailInput,
} from "./types";

export interface AuthContextValue extends AuthState {
  readonly isAuthenticated: boolean;
  readonly userId: UserId | null;
  readonly signIn: (input: SignInInput) => Promise<AuthUser>;
  readonly signUp: (input: SignUpInput) => Promise<AuthUser>;
  readonly signOut: () => Promise<void>;
  readonly forgotPassword: (
    input: ForgotPasswordInput,
  ) => Promise<{ token: string }>;
  readonly resetPassword: (input: ResetPasswordInput) => Promise<void>;
  readonly requestEmailVerification: () => Promise<{ token: string }>;
  readonly verifyEmail: (input: VerifyEmailInput) => Promise<AuthUser>;
  readonly refresh: () => Promise<void>;
  /** Local/dev only — peek tokens when email is not wired. */
  readonly peekResetToken: (email: string) => string | null;
  readonly peekVerifyToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  status: "loading",
  user: null,
  session: null,
  error: null,
  hydrated: false,
};

interface AuthProviderProps {
  readonly children: ReactNode;
  readonly adapter?: AuthProviderPort;
}

export function AuthProvider({
  children,
  adapter,
}: AuthProviderProps): JSX.Element {
  const port = useMemo(
    () => adapter ?? createAuthAdapter("local"),
    [adapter],
  );
  const [state, setState] = useState<AuthState>(initialState);

  const hydrate = useCallback(async () => {
    try {
      const [session, user] = await Promise.all([
        port.getSession(),
        port.getUser(),
      ]);
      setState({
        status: user && session ? "authenticated" : "anonymous",
        user,
        session,
        error: null,
        hydrated: true,
      });
    } catch (error) {
      setState({
        status: "error",
        user: null,
        session: null,
        error: error instanceof Error ? error.message : "Auth hydrate failed",
        hydrated: true,
      });
    }
  }, [port]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [session, user] = await Promise.all([
          port.getSession(),
          port.getUser(),
        ]);
        if (cancelled) return;
        setState({
          status: user && session ? "authenticated" : "anonymous",
          user,
          session,
          error: null,
          hydrated: true,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          user: null,
          session: null,
          error: error instanceof Error ? error.message : "Auth hydrate failed",
          hydrated: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [port]);

  const applyAuth = useCallback((user: AuthUser, session: AuthSession) => {
    setState({
      status: "authenticated",
      user,
      session,
      error: null,
      hydrated: true,
    });
  }, []);

  const signIn = useCallback(
    async (input: SignInInput) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const result = await port.signIn(input);
        applyAuth(result.user, result.session);
        return result.user;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Sign in failed";
        setState((prev) => ({
          ...prev,
          status: "anonymous",
          error: message,
          hydrated: true,
        }));
        throw error;
      }
    },
    [applyAuth, port],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const result = await port.signUp(input);
        applyAuth(result.user, result.session);
        return result.user;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Sign up failed";
        setState((prev) => ({
          ...prev,
          status: "anonymous",
          error: message,
          hydrated: true,
        }));
        throw error;
      }
    },
    [applyAuth, port],
  );

  const signOut = useCallback(async () => {
    await port.signOut();
    setState({
      status: "anonymous",
      user: null,
      session: null,
      error: null,
      hydrated: true,
    });
  }, [port]);

  const forgotPassword = useCallback(
    async (input: ForgotPasswordInput) => port.requestPasswordReset(input),
    [port],
  );

  const resetPassword = useCallback(
    async (input: ResetPasswordInput) => {
      await port.resetPassword(input);
    },
    [port],
  );

  const requestEmailVerification = useCallback(
    async () => port.requestEmailVerification(),
    [port],
  );

  const verifyEmail = useCallback(
    async (input: VerifyEmailInput) => {
      const user = await port.verifyEmail(input);
      setState((prev) => ({
        ...prev,
        user,
        status: prev.session ? "authenticated" : prev.status,
      }));
      return user;
    },
    [port],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.status === "authenticated" && Boolean(state.user),
      userId: state.user?.id ?? null,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      resetPassword,
      requestEmailVerification,
      verifyEmail,
      refresh: hydrate,
      peekResetToken: (email) =>
        port === localAuthAdapter || port.id === "local"
          ? localAuthAdapter.peekResetToken(email)
          : null,
      peekVerifyToken: () =>
        state.user && (port === localAuthAdapter || port.id === "local")
          ? localAuthAdapter.peekVerifyToken(state.user.id)
          : null,
    }),
    [
      state,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      resetPassword,
      requestEmailVerification,
      verifyEmail,
      hydrate,
      port,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useUser(): AuthUser | null {
  return useAuth().user;
}

export function useCurrentUserId(): UserId {
  return useAuth().userId ?? asUserId("user_local_anonymous");
}
