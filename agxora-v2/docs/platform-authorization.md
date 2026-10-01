# External platform authorization

AGXORA connects external accounts only through the provider's official OAuth API, and only after the customer confirms a separate platform authorization. Accepting the AGXORA Terms does not authorize access to Gmail, YouTube, or any other external account.

## Supported providers

Gmail and YouTube are the only providers with a live OAuth implementation. Other catalog entries stay unavailable until a real API integration exists. The product does not invent permissions those APIs do not expose.

## Lifecycle

1. The customer opens Settings → Integrations, Connected Accounts, or the YouTube action in Growth.
2. AGXORA shows only the permissions that provider implements.
3. The customer confirms what is authorized, where, why, which permissions, that the grant lasts until they revoke it, and how to revoke it.
4. Only then does OAuth start. AGXORA chooses the OAuth scopes from the confirmed permissions. Client-supplied scopes, passwords, and tokens are rejected.
5. The callback validates OAuth state, stores the granted scopes, and stores tokens only in the existing encrypted credential record.
6. The customer can see the connection, turn automatic publishing on only when a connected publish permission exists, or disconnect.
7. Disconnect revokes the authorization, clears stored credentials, disables automatic publishing and AI publishing authorization, cancels scheduled or in-progress provider campaign actions, and writes an audit event.

`include_granted_scopes` is false when the customer confirmed a specific permission set, so Google is not asked to silently keep older broader scopes. It stays true only for the existing default connect path that requests the provider's configured scope list.

## Separate decisions

These are not interchangeable:

- AGB acceptance
- privacy acknowledgement
- marketing consent
- platform OAuth authorization
- AI content creation
- automatic publishing

Automatic publishing requires an explicit confirmation, a connected authorization, the publish permission, and a usable credential. An expired access token without a refresh token, a revoked grant, or an `invalid_grant` response disables further provider use.

## Audit and versioning

Authorization and legal-acceptance rows record the user, organization, platform, status, granted scopes, authorization version, and timestamps. The legal framework version is 1.1. A new legal version requires acceptance again. The working text is not a compliance certificate; a qualified German lawyer must review it before public launch.

## Third-party limits

Gmail and YouTube can change or withdraw APIs. AGXORA cannot guarantee that an external platform stays available. That limit does not remove AGXORA's own duties to stop calling an API after revocation, to keep tokens encrypted, and to avoid access the customer did not confirm.
