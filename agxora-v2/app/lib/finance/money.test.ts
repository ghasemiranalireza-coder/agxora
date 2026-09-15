import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  computeLine,
  grossFromNet,
  lineNetTotal,
  moneyString,
  roundMoney,
  taxFromNet,
  totalsFromLines,
} from "./money";

describe("finance money (Decimal)", () => {
  it("computes normal line totals", () => {
    const line = computeLine({ quantity: "2", unitPriceNet: "10.00", taxRate: "19" });
    expect(moneyString(line.lineTotalNet)).toBe("20.00");
    expect(moneyString(line.taxTotal)).toBe("3.80");
    expect(moneyString(line.lineTotalGross)).toBe("23.80");
  });

  it("handles decimal prices and quantities", () => {
    const line = computeLine({ quantity: "1.5", unitPriceNet: "12.99", taxRate: "19.00" });
    expect(moneyString(line.lineTotalNet)).toBe("19.49");
    expect(moneyString(line.taxTotal)).toBe("3.70");
    expect(moneyString(line.lineTotalGross)).toBe("23.19");
  });

  it("supports different VAT rates", () => {
    const reduced = computeLine({ quantity: "1", unitPriceNet: "100.00", taxRate: "7" });
    expect(moneyString(reduced.taxTotal)).toBe("7.00");
    const zero = computeLine({ quantity: "1", unitPriceNet: "50.00", taxRate: "0" });
    expect(moneyString(zero.taxTotal)).toBe("0.00");
    expect(moneyString(zero.lineTotalGross)).toBe("50.00");
  });

  it("rounds half-up to two decimals", () => {
    expect(moneyString(roundMoney("1.225"))).toBe("1.23");
    expect(moneyString(lineNetTotal("3", "0.3333"))).toBe("1.00");
    expect(moneyString(taxFromNet("19.99", "19"))).toBe("3.80");
  });

  it("handles zero values", () => {
    const line = computeLine({ quantity: "0", unitPriceNet: "99.99", taxRate: "19" });
    expect(moneyString(line.lineTotalNet)).toBe("0.00");
    expect(moneyString(line.taxTotal)).toBe("0.00");
    expect(moneyString(line.lineTotalGross)).toBe("0.00");
  });

  it("sums multiple delivery-note lines without float", () => {
    const { totals } = totalsFromLines([
      { quantity: "1", unitPriceNet: "10.10", taxRate: "19" },
      { quantity: "2", unitPriceNet: "5.05", taxRate: "7" },
      { quantity: "1", unitPriceNet: "0.01", taxRate: "0" },
    ]);
    expect(totals.netTotal instanceof Prisma.Decimal).toBe(true);
    expect(moneyString(totals.netTotal)).toBe("20.21");
    expect(moneyString(totals.taxTotal)).toBe("2.63");
    expect(moneyString(grossFromNet(totals.netTotal, totals.taxTotal))).toBe("22.84");
  });
});
