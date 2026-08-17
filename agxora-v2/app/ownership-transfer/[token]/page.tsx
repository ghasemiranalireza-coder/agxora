"use client";

import { useEffect, useState, type JSX } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthCard, authButtonStyle } from "../../components/auth/AuthCard";
import { useAuth } from "../../lib/auth";
import { controlPlaneClient } from "../../lib/control-plane/client";
import { localizeThrownError, useT } from "../../lib/i18n";

export default function OwnershipTransferConfirmPage(): JSX.Element {
  const t = useT();
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(params.token ?? "");
  const { isAuthenticated, hydrated, user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>("loading");
  const [preview, setPreview] = useState<{
    organizationName: string;
    workspaceName: string;
    fromUserName: string;
    fromUserEmail: string;
    toUserName: string;
    toUserEmail: string;
    expiresAt: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await controlPlaneClient.previewOwnershipTransfer(token);
        if (cancelled) return;
        setPreview(data.transfer);
        setStatus(data.transfer.status);
      } catch (err) {
        if (cancelled) return;
        setError(localizeThrownError(t, err, "settings.controlPlane.transferInvalid"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const onConfirm = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await controlPlaneClient.confirmOwnershipTransfer(token);
      router.replace("/dashboard/settings#team");
    } catch (err) {
      setError(localizeThrownError(t, err, "settings.controlPlane.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const next = `/ownership-transfer/${encodeURIComponent(token)}`;
  const emailMatches =
    Boolean(user?.email) &&
    Boolean(preview?.toUserEmail) &&
    user!.email.trim().toLowerCase() === preview!.toUserEmail.trim().toLowerCase();

  return (
    <AuthCard
      title={t("settings.controlPlane.transferConfirmTitle")}
      subtitle={
        preview
          ? `${preview.organizationName} · ${preview.workspaceName}`
          : t("settings.controlPlane.loading")
      }
    >
      {error ? <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p> : null}
      {preview ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "var(--agx-text-muted, #94a3b8)", fontSize: 14 }}>
            {t("settings.controlPlane.transferConfirmBody", {
              from: preview.fromUserName,
              to: preview.toUserName,
              email: preview.toUserEmail,
            })}
          </p>
          <p style={{ color: "var(--agx-danger, #f87171)", fontSize: 13 }}>
            {t("settings.controlPlane.transferConfirmDanger")}
          </p>
          {status !== "pending" ? (
            <p style={{ fontSize: 14 }}>
              {t(`settings.controlPlane.transferStatus.${status}`)}
            </p>
          ) : !hydrated ? (
            <p>{t("settings.controlPlane.loading")}</p>
          ) : !isAuthenticated ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href={`/login?next=${encodeURIComponent(next)}`} style={authButtonStyle}>
                {t("auth.login.submit")}
              </Link>
            </div>
          ) : !emailMatches ? (
            <p style={{ fontSize: 14, color: "#f87171" }}>
              {t("settings.controlPlane.transferWrongAccount", {
                email: preview.toUserEmail,
              })}
            </p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onConfirm()}
              style={{
                ...authButtonStyle,
                background: "rgba(248, 113, 113, 0.2)",
                borderColor: "#f87171",
              }}
            >
              {busy
                ? t("settings.controlPlane.saving")
                : t("settings.controlPlane.transferConfirmAction")}
            </button>
          )}
        </div>
      ) : null}
    </AuthCard>
  );
}
