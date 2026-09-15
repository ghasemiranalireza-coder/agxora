"use client";

import type { JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import { financeLogoUrl, type FinanceDocumentTemplate } from "../../../lib/finance/documents/types";
import type { FinanceDocumentModel } from "./sampleData";
import "./document.css";

function money(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

export function DocumentRenderer({
  model,
  template,
  mode = "full",
}: {
  readonly model: FinanceDocumentModel;
  readonly template: FinanceDocumentTemplate;
  readonly mode?: "full" | "thumb";
}): JSX.Element {
  const { t, locale } = useLocale();
  const branding = model.branding;
  const dir = locale === "fa" || locale === "ar" ? "rtl" : "ltr";
  const logoSrc = financeLogoUrl(branding.logoId);
  const isInvoice = model.kind === "INVOICE";
  const title = isInvoice ? t("finance.documents.invoice") : t("finance.documents.deliveryNote");
  const numberLabel = isInvoice
    ? t("finance.documents.invoiceNumber")
    : t("finance.documents.deliveryNumber");
  const dateLabel = isInvoice
    ? t("finance.documents.invoiceDate")
    : t("finance.documents.deliveryDate");

  const paper = (
    <article
      className={`agx-doc agx-doc--${template.toLowerCase()}`}
      dir={dir}
      style={{
        ["--doc-primary" as string]: branding.primaryColor,
        ["--doc-secondary" as string]: branding.secondaryColor,
      }}
    >
      <header className="agx-doc__header">
        <div className="agx-doc__brand">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="agx-doc__logo" src={logoSrc} alt="" />
          ) : (
            <span className="agx-doc__mark" aria-hidden="true">
              {branding.companyName.slice(0, 1) || "A"}
            </span>
          )}
          <div className="agx-doc__seller">
            <p className="agx-doc__company">{branding.companyName || t("finance.documents.yourCompany")}</p>
            <p>
              {[branding.street, `${branding.postalCode} ${branding.city}`.trim(), branding.country]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p>{[branding.phone, branding.email, branding.website].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="agx-doc__titleblock">
          <p className="agx-doc__kicker">{title}</p>
          <h2 className="agx-doc__number">{model.number}</h2>
        </div>
      </header>

      <section className="agx-doc__meta" aria-label={t("finance.documents.meta")}>
        <div>
          <span>{t("finance.documents.customer")}</span>
          <strong>{model.customer.companyName}</strong>
          <p>{[model.customer.address, model.customer.city, model.customer.country].filter(Boolean).join(", ")}</p>
        </div>
        <dl>
          <div>
            <dt>{numberLabel}</dt>
            <dd>{model.number}</dd>
          </div>
          <div>
            <dt>{dateLabel}</dt>
            <dd>{model.date}</dd>
          </div>
          {isInvoice && model.dueDate ? (
            <div>
              <dt>{t("finance.documents.dueDate")}</dt>
              <dd>{model.dueDate}</dd>
            </div>
          ) : null}
          {model.orderNumber ? (
            <div>
              <dt>{t("finance.documents.orderNumber")}</dt>
              <dd>{model.orderNumber}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <div className="agx-doc__tablewrap">
        <table className="agx-doc__table">
          <thead>
            <tr>
              <th>{t("finance.documents.description")}</th>
              <th>{t("finance.documents.quantity")}</th>
              <th>{t("finance.documents.unitPrice")}</th>
              <th>{t("finance.documents.vat")}</th>
              <th>{t("finance.documents.total")}</th>
            </tr>
          </thead>
          <tbody>
            {model.items.map((item, index) => (
              <tr key={`${item.description}-${index}`}>
                <td>{item.description}</td>
                <td>
                  {item.quantity} {item.unit}
                </td>
                <td>{money(item.unitPriceNet, model.currency)}</td>
                <td>{item.taxRate}%</td>
                <td>{money(item.lineTotalNet, model.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="agx-doc__totals">
        <p>
          <span>{t("finance.documents.net")}</span>
          <strong>{money(model.netTotal, model.currency)}</strong>
        </p>
        <p>
          <span>{t("finance.documents.tax")}</span>
          <strong>{money(model.taxTotal, model.currency)}</strong>
        </p>
        <p className="agx-doc__gross">
          <span>{t("finance.documents.gross")}</span>
          <strong>{money(model.grossTotal, model.currency)}</strong>
        </p>
      </section>

      <footer className="agx-doc__footer">
        {branding.vatId || branding.taxNumber ? (
          <p>
            {branding.vatId ? `${t("finance.documents.vatId")}: ${branding.vatId}` : ""}
            {branding.vatId && branding.taxNumber ? " · " : ""}
            {branding.taxNumber ? `${t("finance.documents.taxNumber")}: ${branding.taxNumber}` : ""}
          </p>
        ) : null}
        {branding.iban || branding.bic ? (
          <p>
            {branding.iban ? `IBAN ${branding.iban}` : ""}
            {branding.iban && branding.bic ? " · " : ""}
            {branding.bic ? `BIC ${branding.bic}` : ""}
          </p>
        ) : null}
        {branding.commercialRegister || branding.managingDirector ? (
          <p>
            {[branding.managingDirector, branding.commercialRegister].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className="agx-doc__printnote">{t("finance.documents.printReady")}</p>
      </footer>
    </article>
  );

  if (mode === "thumb") {
    return <div className="agx-doc-thumb">{paper}</div>;
  }
  return <div className="agx-doc-stage">{paper}</div>;
}
