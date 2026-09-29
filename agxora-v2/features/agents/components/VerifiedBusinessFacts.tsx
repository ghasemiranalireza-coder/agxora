"use client";

import { useEffect, useState, type FormEvent, type JSX } from "react";
import { Button, Card, FormField, FormSelect, FormTextArea } from "@/app/components/ui";
import { BUSINESS_FACT_CATEGORIES, type BusinessFactCategory } from "../memory/businessContext";

const CATEGORY_LABEL: Record<BusinessFactCategory, string> = {
  BUSINESS_NAME: "Business name",
  BUSINESS_DESCRIPTION: "What the business does",
  AUDIENCE: "Who it serves",
  OFFER: "Standing offer",
  SERVICE_AREA: "Service area",
  OPENING_HOURS: "Opening hours",
  BRAND_RULE: "Brand rule",
  ALLOWED_CLAIM: "Allowed claim",
  PROHIBITED_CLAIM: "Claim that must not be made",
};

interface SavedFact {
  readonly memoryId: string;
  readonly category: string | null;
  readonly statement: string;
  readonly allowedForMarketing: boolean;
}

export function VerifiedBusinessFacts(): JSX.Element {
  const [category, setCategory] = useState<BusinessFactCategory>("OFFER");
  const [statement, setStatement] = useState("");
  const [allowedForMarketing, setAllowedForMarketing] = useState(true);
  const [preview, setPreview] = useState<{ category: BusinessFactCategory; statement: string; allowedForMarketing: boolean } | null>(null);
  const [saved, setSaved] = useState<readonly SavedFact[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(): Promise<void> {
    const response = await fetch("/api/v1/agents/marketing/business-facts");
    const body = (await response.json()) as { ok?: boolean; facts?: SavedFact[]; error?: string };
    if (!response.ok || !body.ok) {
      setError(body.error ?? "Verified business facts could not be loaded.");
      return;
    }
    setSaved(body.facts ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/agents/marketing/business-facts")
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; facts?: SavedFact[]; error?: string };
        if (cancelled) return;
        if (!response.ok || !body.ok) {
          setError(body.error ?? "Verified business facts could not be loaded.");
          return;
        }
        setSaved(body.facts ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Verified business facts could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function review(event: FormEvent): void {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const text = statement.trim().replace(/\s+/g, " ");
    if (!text) {
      setError("Enter the fact in your own words.");
      return;
    }
    setPreview({ category, statement: text, allowedForMarketing });
  }

  async function confirm(): Promise<void> {
    if (!preview) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/agents/marketing/business-facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          category: preview.category,
          statement: preview.statement,
          allowedForMarketing: preview.allowedForMarketing,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        replayed?: boolean;
        result?: { authoritative?: boolean; verification?: string };
      };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "The fact was not saved.");
        return;
      }
      setMessage(body.result?.verification ?? "The confirmed business fact was durably stored.");
      setPreview(null);
      setStatement("");
      await load();
    } catch {
      setError("The fact was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Verified business facts</h2>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          These facts can be used by AGXORA when preparing marketing and other business work. Only facts you confirm become verified.
        </p>
      </div>
      <form className="space-y-3" onSubmit={review}>
        <FormField label="Category">
          <FormSelect
            aria-label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value as BusinessFactCategory)}
          >
            {BUSINESS_FACT_CATEGORIES.map((item) => (
              <option key={item} value={item}>{CATEGORY_LABEL[item]}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Statement">
          <FormTextArea
            aria-label="Statement"
            rows={3}
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            placeholder="Write the fact exactly as you want it stored."
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowedForMarketing}
            onChange={(event) => setAllowedForMarketing(event.target.checked)}
          />
          Marketing may use this fact
        </label>
        <Button type="submit" variant="secondary">Review fact</Button>
      </form>
      {preview ? (
        <div className="space-y-3 rounded-md border p-3" style={{ borderColor: "var(--agx-border, #334155)" }}>
          <p className="text-sm font-medium">This is exactly what will be stored after you confirm.</p>
          <p className="text-sm">Category: {CATEGORY_LABEL[preview.category]}</p>
          <p className="text-sm">Statement: {preview.statement}</p>
          <p className="text-sm">Marketing: {preview.allowedForMarketing ? "Allowed" : "Not allowed"}</p>
          <p className="text-sm">Status after confirmation: Verified</p>
          <div className="flex gap-2">
            <Button type="button" disabled={busy} onClick={() => void confirm()}>Confirm and save</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}
      {message ? <p className="text-sm">{message}</p> : null}
      {error ? <p className="text-sm">{error}</p> : null}
      {saved.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {saved.map((fact) => (
            <li key={fact.memoryId}>
              {fact.category ? `${CATEGORY_LABEL[fact.category as BusinessFactCategory] ?? fact.category}: ` : ""}
              {fact.statement}
              {" "}
              <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Verified</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
