"use client";

import { useEffect, useState, type JSX } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthCard, authButtonStyle } from "../../components/auth/AuthCard";
import { useAuth } from "../../lib/auth";
import { controlPlaneClient } from "../../lib/control-plane/client";
import { useT, resolveUserFacingErrorKey } from "../../lib/i18n";

export default function InviteAcceptPage(): JSX.Element {
  const t = useT();
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(params.token ?? "");
  const { isAuthenticated, hydrated } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>("loading");
  const [preview, setPreview] = useState<{
    invitedEmail: string;
    workspaceName: string;
    organizationName: string;
    role: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await controlPlaneClient.previewInvite(token);
        if (cancelled) return;
        setPreview(data.invitation);
        setStatus(data.invitation.status);
      } catch (err) {
        if (cancelled) return;
        setError(t(resolveUserFacingErrorKey(err, "settings.controlPlane.inviteInvalid")));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const onAccept = async (): Promise<void> => {
    setBusy(true);
    try {
      await controlPlaneClient.acceptInvite(token);
      router.replace("/dashboard/settings#team");
    } catch (err) {
      setError(t(resolveUserFacingErrorKey(err, "settings.controlPlane.saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  const next = `/invite/${encodeURIComponent(token)}`;

  return (
    <AuthCard
      title={t("settings.controlPlane.inviteTitle")}
      subtitle={preview ? `${preview.organizationName} · ${preview.workspaceName}` : t("settings.controlPlane.loading")}
    >
      {error ? <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p> : null}
      {preview ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "var(--agx-text-muted, #94a3b8)", fontSize: 14 }}>
            {t("settings.controlPlane.invitedAs", {
              email: preview.invitedEmail,
              role: preview.role,
            })}
          </p>
          {status !== "pending" ? (
            <p style={{ fontSize: 14 }}>{t(`settings.controlPlane.inviteStatus.${status}`)}</p>
          ) : !hydrated ? (
            <p>{t("settings.controlPlane.loading")}</p>
          ) : !isAuthenticated ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href={`/login?next=${encodeURIComponent(next)}`} style={authButtonStyle}>
                {t("auth.login.submit")}
              </Link>
              <Link href={`/register?next=${encodeURIComponent(next)}`} style={authButtonStyle}>
                {t("auth.register.submit")}
              </Link>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAccept()}
              style={authButtonStyle}
            >
              {busy ? t("settings.controlPlane.saving") : t("settings.controlPlane.accept")}
            </button>
          )}
        </div>
      ) : null}
    </AuthCard>
  );
}
