"use client";

import { useEffect, useState, type JSX } from "react";
import QRCode from "qrcode";

const QR_DARK = "#111111";
const QR_LIGHT = "#FFFFFF";
const QR_SIZE = 192;

export function SepaQrCode({
  payload,
  label,
}: {
  readonly payload: string;
  readonly label: string;
}): JSX.Element {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: QR_SIZE,
      color: { dark: QR_DARK, light: QR_LIGHT },
    }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!src) {
    return <div className="agx-doc__qr agx-doc__qr--pending" aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="agx-doc__qr" src={src} alt={label} width={144} height={144} />
  );
}
