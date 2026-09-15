/**
 * Deterministic monetary arithmetic using Prisma Decimal (decimal.js).
 * Never persist totals computed with JavaScript floating-point numbers.
 */

import { Prisma } from "@prisma/client";
import { PersistenceError } from "@/app/lib/tenancy/errors";

const Decimal = Prisma.Decimal;

export type DecimalLike = Prisma.Decimal | string | number;

export const MONEY_SCALE = 2;
export const QUANTITY_SCALE = 4;
export const TAX_RATE_SCALE = 2;
export const DEFAULT_TAX_RATE = "19.00";

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 20,
});

export function moneyDecimal(value: DecimalLike): Prisma.Decimal {
  try {
    const parsed = new Decimal(value);
    if (!parsed.isFinite()) {
      throw new Error("non-finite");
    }
    return parsed;
  } catch {
    throw new PersistenceError("validation", "Invalid monetary value", {
      details: [{ message: "Amount must be a finite decimal" }],
    });
  }
}

export function roundMoney(value: DecimalLike): Prisma.Decimal {
  return moneyDecimal(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

export function roundQuantity(value: DecimalLike): Prisma.Decimal {
  return moneyDecimal(value).toDecimalPlaces(QUANTITY_SCALE, Decimal.ROUND_HALF_UP);
}

export function roundTaxRate(value: DecimalLike): Prisma.Decimal {
  return moneyDecimal(value).toDecimalPlaces(TAX_RATE_SCALE, Decimal.ROUND_HALF_UP);
}

export function moneyString(value: DecimalLike, scale: number = MONEY_SCALE): string {
  return moneyDecimal(value).toFixed(scale);
}

export function lineNetTotal(quantity: DecimalLike, unitPriceNet: DecimalLike): Prisma.Decimal {
  return roundMoney(moneyDecimal(quantity).mul(moneyDecimal(unitPriceNet)));
}

export function taxFromNet(net: DecimalLike, taxRatePercent: DecimalLike): Prisma.Decimal {
  return roundMoney(moneyDecimal(net).mul(moneyDecimal(taxRatePercent)).div(100));
}

export function grossFromNet(net: DecimalLike, tax: DecimalLike): Prisma.Decimal {
  return roundMoney(moneyDecimal(net).add(moneyDecimal(tax)));
}

export type ComputedLine = {
  readonly quantity: Prisma.Decimal;
  readonly unitPriceNet: Prisma.Decimal;
  readonly taxRate: Prisma.Decimal;
  readonly lineTotalNet: Prisma.Decimal;
  readonly taxTotal: Prisma.Decimal;
  readonly lineTotalGross: Prisma.Decimal;
};

export function computeLine(input: {
  readonly quantity: DecimalLike;
  readonly unitPriceNet: DecimalLike;
  readonly taxRate: DecimalLike;
}): ComputedLine {
  const quantity = roundQuantity(input.quantity);
  const unitPriceNet = moneyDecimal(input.unitPriceNet).toDecimalPlaces(
    QUANTITY_SCALE,
    Decimal.ROUND_HALF_UP,
  );
  const taxRate = roundTaxRate(input.taxRate);
  if (quantity.lt(0) || unitPriceNet.lt(0) || taxRate.lt(0)) {
    throw new PersistenceError("validation", "Quantity, price, and tax rate must be >= 0");
  }
  if (taxRate.gt(100)) {
    throw new PersistenceError("validation", "Tax rate must be between 0 and 100");
  }
  const lineTotalNet = lineNetTotal(quantity, unitPriceNet);
  const taxTotal = taxFromNet(lineTotalNet, taxRate);
  return {
    quantity,
    unitPriceNet,
    taxRate,
    lineTotalNet,
    taxTotal,
    lineTotalGross: grossFromNet(lineTotalNet, taxTotal),
  };
}

export type DocumentTotals = {
  readonly netTotal: Prisma.Decimal;
  readonly taxTotal: Prisma.Decimal;
  readonly grossTotal: Prisma.Decimal;
};

export function sumDocumentTotals(
  lines: readonly Pick<ComputedLine, "lineTotalNet" | "taxTotal" | "lineTotalGross">[],
): DocumentTotals {
  let net = new Decimal(0);
  let tax = new Decimal(0);
  let gross = new Decimal(0);
  for (const line of lines) {
    net = net.add(line.lineTotalNet);
    tax = tax.add(line.taxTotal);
    gross = gross.add(line.lineTotalGross);
  }
  return {
    netTotal: roundMoney(net),
    taxTotal: roundMoney(tax),
    grossTotal: roundMoney(gross),
  };
}

export function totalsFromLines(
  items: readonly {
    readonly quantity: DecimalLike;
    readonly unitPriceNet: DecimalLike;
    readonly taxRate: DecimalLike;
  }[],
): { readonly lines: readonly ComputedLine[]; readonly totals: DocumentTotals } {
  const lines = items.map((item) => computeLine(item));
  return { lines, totals: sumDocumentTotals(lines) };
}
