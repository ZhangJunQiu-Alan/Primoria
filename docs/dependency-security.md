# Dependency Security

Production dependencies are audited in CI with:

```bash
pnpm audit:prod
```

The command fails on `high` or `critical` advisories. `pnpm audit --prod` may
still report lower severities; those remain visible for normal dependency
maintenance but do not block every change.

2026-07-12 baseline: upgrading Next.js from 16.1.6 to 16.2.6 and applying the
documented transitive fixes reduced the production audit from 8 low / 28
moderate / 12 high to 1 low / 1 moderate / 0 high. The two remaining findings
are tracked below.

## Overrides

Root `pnpm.overrides` may be used only when the patched transitive version stays
within the dependency's compatible API line, or when the replaced adapter is
covered by repository type, unit, integration, and production-build tests.
Remove an override once its direct owner resolves the vulnerable dependency.

| Override | Owner | Reason | Removal condition |
| --- | --- | --- | --- |
| `@ag-ui/langgraph@0.0.27 -> 0.0.42` | Agent/runtime | CopilotKit pins an adapter that pulls vulnerable `langsmith`; the replacement also aligns with LangChain Core 1.x. | CopilotKit directly requires `@ag-ui/langgraph >=0.0.42`. |
| `@babel/core <7.29.6 -> 7.29.6` | Web/build | Fix source-map comment arbitrary file reads in the Next styled-jsx build path. | Next directly resolves 7.29.6 or newer. |
| `dompurify <3.4.11 -> 3.4.11` | Web/rendering | Fix Mermaid sanitizer mutation, cross-realm, and `IN_PLACE` bypasses with available patches. | Mermaid directly resolves 3.4.11 or newer. |
| `form-data <4.0.6 -> 4.0.6` | Platform/dependencies | Fix multipart field-name and filename CRLF injection. | No production path resolves a version below 4.0.6. |
| `hono <4.12.25 -> 4.12.25` | Platform/dependencies | Fix credentialed CORS origin reflection in the middleware default. | CopilotKit, MCP SDK, and memory dependencies all resolve 4.12.25 or newer. |
| `postcss 8.x <8.5.10 -> 8.5.10` | Web/build | Fix unsafe CSS stringification in the Next build dependency. | Next directly resolves 8.5.10 or newer. |
| `prismjs <1.30.0 -> 1.30.0` | Web/rendering | Fix DOM clobbering in CopilotKit's refractor syntax-highlighting path. | Refractor directly resolves 1.30.0 or newer. |
| `ws 8.x <8.21.0 -> 8.21.0` | Agent/runtime | Fix fragmented-message memory exhaustion in production WebSocket clients. | All production owners require 8.21.0 or newer. |

## Temporary Exceptions

There are currently no active high/critical exceptions. Any future exception
must be added below before merging and include all fields:

| Advisory | Package/path | Owner | Reachability and reason | Compensating control | Expires |
| --- | --- | --- | --- | --- | --- |

## Tracked Non-Blocking Findings

| Advisory | Severity | Package/path | Owner | Reachability and action | Review by |
| --- | --- | --- | --- | --- | --- |
| `GHSA-w5hq-g745-h8pq` | Moderate | `@langchain/langgraph -> uuid@10` | Agent/runtime | The vulnerable v3/v5/v6 path requires a caller-supplied output buffer. LangGraph calls v5/v6 without that buffer; do not force a cross-major override. Remove when LangGraph requires `uuid >=11.1.1`. | 2026-10-12 |
| `GHSA-866g-f22w-33x8` | Low | `@copilotkit/runtime -> @ai-sdk/google-vertex -> @ai-sdk/provider-utils` | Agent/runtime | No patched version is published. Primoria does not configure the Google Vertex adapter; monitor CopilotKit/AI SDK releases. | 2026-10-12 |
