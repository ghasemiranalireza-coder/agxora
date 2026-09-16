# AGXORA email worker

Standalone transactional mail worker. AGXORA already speaks HTTP:

```
AGXORA  →  POST /send  →  this worker  →  Resend or Postmark  →  inbox
```

This service has **no Prisma**, **no AGXORA database access**, and **must never
receive `DATABASE_URL`**. The ESP API key lives **only** in this worker's
environment.

## Why Resend (default)

The AGXORA app already POSTs `{ from, to, subject, text, kind, actionUrl }`.
Resend's REST API is a single `POST https://api.resend.com/emails` call — no
in-app SDK, no Prisma, no extra AGXORA dependencies.

Postmark is implemented as an alternative (`EMAIL_WORKER_ESP=postmark`) with the
same worker contract.

Do **not** add a Resend/Postmark SDK to the Next.js app.

## Payload

`POST /send` (also accepted at `POST /`)

```json
{
  "from": "noreply@agxora.de",
  "to": "customer@example.com",
  "subject": "Verify your AGXORA email",
  "text": "...",
  "kind": "email_verification",
  "actionUrl": "https://agxora.de/verify-email?token=..."
}
```

Security:

- `Authorization: Bearer $EMAIL_WORKER_TOKEN` is required
- required fields are validated
- recipient and from addresses are validated
- optional `EMAIL_WORKER_ALLOWED_FROM` pins the From mailbox
- payload size is capped (`EMAIL_WORKER_MAX_BYTES`, default 65536)
- logs never include bearer tokens, ESP keys, action URLs, or recipients
- ESP error bodies are not forwarded to AGXORA

`GET /health` returns `{ ok: true, service: "agxora-email-worker" }` with no secrets.

## Environment (worker only)

| Variable | Purpose |
|----------|---------|
| `EMAIL_WORKER_TOKEN` | Shared bearer secret (same value as `AGXORA_EMAIL_HTTP_TOKEN`) |
| `EMAIL_WORKER_ESP` | `resend` (default) or `postmark` |
| `RESEND_API_KEY` | Resend API key — **worker env only** |
| `POSTMARK_SERVER_TOKEN` | Postmark server token — **worker env only** |
| `EMAIL_WORKER_ALLOWED_FROM` | Optional exact From mailbox (use `noreply@agxora.de` in production) |
| `EMAIL_WORKER_HOST` / `EMAIL_WORKER_PORT` | Listen address |

Never commit real values. Never put `RESEND_API_KEY` or `POSTMARK_SERVER_TOKEN`
in the AGXORA Vercel project.

## AGXORA Production env (set only after a real worker URL exists)

```
AGXORA_EMAIL_PROVIDER=http
AGXORA_EMAIL_HTTP_URL=https://<REAL_WORKER_HOST>/send
AGXORA_EMAIL_HTTP_TOKEN=<same as EMAIL_WORKER_TOKEN>
AGXORA_EMAIL_FROM=noreply@agxora.de
NEXT_PUBLIC_AGXORA_SITE_URL=https://agxora.de
```

Do not enter placeholders. If the worker URL or token is not available, leave
Production email env unchanged.

## Domain authentication (`agxora.de`)

Production From address: **`noreply@agxora.de`** (not `noreply@agxora.app`).

Add `agxora.de` in the ESP dashboard (Resend → Domains, or Postmark → Sender
Signatures / Domains). Copy the **exact** DNS records the dashboard shows.

Typical categories:

- SPF (Resend often uses a `send` subdomain TXT + MX, or CNAMEs for newer domains)
- DKIM
- DMARC (`_dmarc.agxora.de`) — recommended, values are chosen by you / the ESP wizard

**This repository does not contain DNS record values.** Inventing SPF/DKIM
strings will fail verification. Paste the live dashboard values into DNS, wait
for the ESP to mark the domain verified, then send a test.

Until the ESP shows the domain as verified, do not claim email is production-ready.

## Run locally

```bash
cd email-worker
# fill .env from .env.example with real secrets (never commit .env)
node --env-file=.env --experimental-strip-types src/server.ts
```

AGXORA local:

```
AGXORA_EMAIL_PROVIDER=http
AGXORA_EMAIL_HTTP_URL=http://127.0.0.1:8787/send
AGXORA_EMAIL_HTTP_TOKEN=<same as EMAIL_WORKER_TOKEN>
AGXORA_EMAIL_FROM=noreply@agxora.de
```
