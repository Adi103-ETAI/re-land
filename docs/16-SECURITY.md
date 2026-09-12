# 16 — Security

> Related: [04-ROLES-AND-RBAC](./04-ROLES-AND-RBAC.md) · [15-AUDIT-AND-PROVENANCE](./15-AUDIT-AND-PROVENANCE.md) · [10-SYSTEM-ARCHITECTURE](./10-SYSTEM-ARCHITECTURE.md)
> Traces: REQ-SEC-001

## 1. Purpose

Defines the security posture required for a system handling sensitive government land records, without overstating what the SIH prototype can actually achieve or certify.

## 2. Security Domains (source prompt §32)

| Domain | Requirement |
|---|---|
| Authentication | All officer access requires login; no anonymous access to record content. |
| RBAC / Authorization | Enforced per [04-ROLES-AND-RBAC](./04-ROLES-AND-RBAC.md) at the API layer, not only the UI (UI-only enforcement is not security). |
| Encrypted storage | Documents, page images, and database contents encrypted at rest; connections encrypted in transit (TLS). |
| Secure document access | Original documents/page images served via authenticated, scoped access — never publicly reachable URLs. |
| API authentication | Every internal API call authenticated (token-based); BFF never exposes raw backend credentials to the browser. |
| Audit logging | Per [15-AUDIT-AND-PROVENANCE](./15-AUDIT-AND-PROVENANCE.md), immutable. |
| Rate limiting | Applied to authentication endpoints and bulk upload endpoints to reduce abuse/DoS exposure. |
| Secret management | API keys (e.g. VLM provider keys) stored in a secrets manager / environment injection, never committed to source control. |
| Secure file validation | Uploaded files validated (type, size, structure) before processing; reject unexpected executable content disguised as documents. |
| Malware/file scanning | Uploaded files scanned before being processed or stored long-term, where feasible. |
| Data retention policy | Explicit policy for how long originals, derived data, and audit logs are kept (see Open Questions — government-dependent). |
| Backup/recovery | Regular backups of the database and object storage; documented recovery procedure. |
| Environment separation | Dev/staging/production isolated, with separate credentials and reference datasets (see [10-SYSTEM-ARCHITECTURE](./10-SYSTEM-ARCHITECTURE.md) §6). |

## 3. A Note on the Current Codebase

The codebase audit that informed this documentation set found: CORS restricted only to `localhost:3000`, no authentication implemented, no RBAC on the verification endpoint, and a real VLM API key present in a committed `.env` file. **[LLD]** This document treats all of the above as required remediation items for the redesign — none of these gaps are acceptable in even a shared prototype deployment, let alone production. Specifically: rotate any exposed key immediately and move secret handling to environment injection / a secrets manager regardless of which phase of the roadmap is active.

## 4. Authentication Approach

- **Prototype:** simplified login (e.g. username/password against a small seeded user table) is acceptable to demonstrate RBAC and audit flows.
- **Production [FUTURE]:** integration with a proper identity provider, potentially a government SSO system — not assumed available during SIH development.

## 5. Authorization Enforcement Points

**[LLD]** Every API endpoint checks Role + Organizational Scope + Action Permission (per [04-ROLES-AND-RBAC](./04-ROLES-AND-RBAC.md)) server-side. The UI may additionally hide unavailable actions for clarity, but the API is the actual enforcement boundary — a hidden button is not a security control.

## 6. File Upload Safety

Given LANDLENS accepts bulk file uploads from government officers (a plausible attack surface), the pipeline should, before any processing:
1. Validate declared vs. actual file type.
2. Enforce size/page-count limits (configurable).
3. Scan for malware where feasible.
4. Isolate processing so a malformed file cannot compromise the broader system (e.g. sandboxed image/PDF parsing libraries).

## 7. Data Sensitivity

Land ownership records are personally identifiable and administratively sensitive. **[LLD]** Access to record content (not just metadata) should always be scope-checked, and export/sync actions to external systems should themselves be audited (see [15-AUDIT-AND-PROVENANCE](./15-AUDIT-AND-PROVENANCE.md) §5).

## 8. What This Document Does Not Claim

**[LLD]** LANDLENS does not claim compliance with any specific government security certification or standard unless and until such certification is actually pursued and achieved (source prompt §32: "Do not claim government-grade certification unless actually achieved"). This document describes target security *practices*, not a certification status.

## 9. Prototype vs Production

| | Prototype | Production |
|---|---|---|
| Auth | Simplified login | Full IdP / possible government SSO |
| Secrets | `.env`-based but never committed; rotated immediately if exposed | Managed secrets service |
| Encryption | TLS in transit; at-rest encryption via managed DB/storage defaults | Same, plus potentially stricter key management (HSM/KMS) per government requirement |
| File scanning | Basic type/size validation | Full malware scanning integration |

## 10. Open Questions

- Government-mandated data residency / hosting requirements (e.g. NIC MeghRaj) — not specified as a hard requirement by the provided SIH documentation, listed only as a suggested technology option.
- Formal retention period and legal basis for retaining personal ownership data — requires government/legal clarification.
