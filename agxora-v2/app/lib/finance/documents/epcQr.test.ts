/**
 * EPC069-12 / GiroCode payload encoding tests.
 */
import { describe, expect, it } from "vitest";
import {
  buildEpcQrPayload,
  buildPaymentQrSnapshot,
  DEFAULT_QR_SETTINGS,
  formatEpcAmount,
  isValidIban,
  normalizeIban,
} from "./epcQr";

const VALID_IBAN_A = "DE89 3704 0044 0532 0130 00";
const VALID_IBAN_B = "DE44500105175407324931";

describe("SEPA/EPC QR payload", () => {
  it("encodes an EPC Credit Transfer initiation payload, not plain text", () => {
    const { payload, missing } = buildEpcQrPayload({
      beneficiaryName: "Nordlicht Handel GmbH",
      iban: VALID_IBAN_A,
      bic: "COBADEFFXXX",
      amount: "1439.90",
      remittance: "RE-2026-000002",
    });
    expect(missing).toEqual([]);
    expect(payload).toBe(
      ["BCD", "002", "1", "SCT", "COBADEFFXXX", "Nordlicht Handel GmbH", "DE89370400440532013000", "EUR1439.90", "", "RE-2026-000002"].join(
        "\n",
      ),
    );
    expect(payload).not.toMatch(/IBAN:\s/i);
  });

  it("validates IBAN checksums", () => {
    expect(isValidIban(VALID_IBAN_A)).toBe(true);
    expect(isValidIban(VALID_IBAN_B)).toBe(true);
    expect(isValidIban("DE00000000000000000000")).toBe(false);
    expect(normalizeIban(VALID_IBAN_A)).toBe("DE89370400440532013000");
  });

  it("does not emit a payload when IBAN is missing", () => {
    const { payload, missing } = buildEpcQrPayload({
      beneficiaryName: "Nordlicht Handel GmbH",
      iban: "",
      amount: "10.00",
    });
    expect(payload).toBeNull();
    expect(missing).toContain("missing_iban");
  });

  it("rejects invalid amounts and keeps EUR formatting", () => {
    expect(formatEpcAmount("12.3")).toBe("EUR12.30");
    expect(formatEpcAmount("0")).toBeNull();
    expect(formatEpcAmount("-1")).toBeNull();
  });

  it("freezes snapshot fields used for historical invoice QR codes", () => {
    const payment = buildPaymentQrSnapshot(
      DEFAULT_QR_SETTINGS,
      { companyName: "Nordlicht Handel GmbH", iban: VALID_IBAN_A, bic: "COBADEFFXXX" },
      {
        amount: "1439.90",
        currency: "EUR",
        invoiceNumber: "RE-2026-000002",
        customerName: "Hanseatische Handels GmbH",
      },
    );
    expect(payment.enabled).toBe(true);
    expect(payment.iban).toBe("DE89370400440532013000");
    expect(payment.epcPayload).toContain("DE89370400440532013000");
    expect(payment.epcPayload).toContain("EUR1439.90");
    expect(payment.epcPayload).toContain("RE-2026-000002");
    expect(payment.reference).toBe("RE-2026-000002");
  });
});
