# Dependency Security

Production dependencies are audited in CI with:

```bash
pnpm audit:prod
```

The command fails on `high` or `critical` advisories. It uses
`scripts/audit-prod-bulk.mjs`, which collects production dependency versions
from `pnpm -r list --prod --json --depth Infinity` and calls npm's supported
bulk advisory endpoint directly. Lower severities remain visible for normal
dependency maintenance but do not block every change. Exact package versions
listed in `scripts/audit-exceptions.json` are checked separately: only their
named advisories are accepted, only until the entry's `expires` date, and an
expired entry fails the audit.

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
| `@azure/msal-node >=5.0.0-beta.0 <7.1.0 -> 7.1.0` | Platform/dependencies | Cross-major, on an unreachable path: `@azure/identity` loads only from `mem0ai/oss`, while `packages/memory` imports the `mem0ai` client entry, and only when the mem0 provider is enabled. | `@azure/identity` requires `@azure/msal-node >=7.1.0`, or `mem0ai` drops it. |
| `@babel/core <7.29.6 -> 7.29.6` | Web/build | Fix source-map comment arbitrary file reads in the Next styled-jsx build path. | Next directly resolves 7.29.6 or newer. |
| `body-parser 1.x <1.20.9 -> 1.20.9`, `2.x <2.4.0 -> 2.4.0` | Platform/dependencies | Same-line patches for the Express request-body parsers. | All production owners require the patched versions. |
| `dompurify <3.4.11 -> 3.4.11` | Web/rendering | Fix Mermaid sanitizer mutation, cross-realm, and `IN_PLACE` bypasses with available patches. | Mermaid directly resolves 3.4.11 or newer. |
| `form-data <4.0.6 -> 4.0.6` | Platform/dependencies | Fix multipart field-name and filename CRLF injection. | No production path resolves a version below 4.0.6. |
| `hono <4.12.25 -> 4.12.25` | Platform/dependencies | Fix credentialed CORS origin reflection in the middleware default. | CopilotKit, MCP SDK, and memory dependencies all resolve 4.12.25 or newer. |
| `postcss 8.x <8.5.10 -> 8.5.10` | Web/build | Fix unsafe CSS stringification in the Next build dependency. | Next directly resolves 8.5.10 or newer. |
| `prismjs <1.30.0 -> 1.30.0` | Web/rendering | Fix DOM clobbering in CopilotKit's refractor syntax-highlighting path. | Refractor directly resolves 1.30.0 or newer. |
| `undici <6 / 6.x -> 6.29.1`, `7.x -> 7.30.1` | Platform/dependencies | Same-line patches for the Node fetch client. | All production owners require the patched versions. |
| `ws 8.x <8.21.0 -> 8.21.0` | Agent/runtime | Fix fragmented-message memory exhaustion in production WebSocket clients. | All production owners require 8.21.0 or newer. |
| `zod 4.x <4.6.6 -> 4.6.6` | Platform/dependencies | Fix `GHSA-mrhx-c7xc-m3w5` issue accumulation for every zod 4 consumer. Web, Agent, and contracts depend on `zod ^4.6.6` directly. | All zod 4 consumers require 4.6.6 or newer. |

| `fast-uri 3.x <3.1.9 -> 3.1.9` | Platform/dependencies | Patch scheme, host and path normalization advisories without crossing the 3.x API line. | All owners require 3.1.9 or newer. |
| `ip-address <=10.7.3 -> 10.7.4` | Platform/dependencies | Bound IPv6 zone identifier matching time. | All owners require 10.7.4 or newer. |
| `fast-copy 3.x <3.1.0 -> 3.1.0` | Platform/dependencies | Prevent stack exhaustion on deeply nested values. | All owners require 3.1.0 or newer. |
| `katex <0.18.2 -> 0.18.2` | Web/rendering | Prevent an already polluted prototype from bypassing trust restrictions. The existing build, math rendering and browser regression cover the compatibility override. | Mermaid, rehype-katex and Web resolve patched KaTeX. |

## Temporary Exceptions

Every entry in `scripts/audit-exceptions.json` must be listed here with all
fields before merging:

| Advisory | Package/path | Owner | Reachability and reason | Compensating control | Expires |
| --- | --- | --- | --- | --- | --- |
| `GHSA-mrhx-c7xc-m3w5` (high) | `zod@3.25.76` via `@copilotkit/runtime`, `@copilotkit/shared`, `@copilotkit/a2ui-renderer`, `@a2ui/web_core`, `@ag-ui/core@0.0.52`, `@ag-ui/client@0.0.52`, `mem0ai` | Web/runtime | Reachable: CopilotKit parses `/api/copilotkit` bodies and the Agent parses `/agent` bodies with AG-UI's zod 3 `RunAgentInputSchema`, which records an issue for every invalid array element (3.2 MB of invalid messages measured at ~780 MB of heap). No zod 3 release is patched, and CopilotKit 1.79.1 and AG-UI 1.0.3 still resolve zod 3. Overriding zod 3 to 4.6.6 keeps runtime behavior but turns the AG-UI and CopilotKit type declarations into `unknown`, failing Web typecheck. | Web (after auth) and the Agent reject input with more than `AGENT_INPUT_MAX_ARRAY_ITEMS` (10,000) schema-validated array elements with 413 before AG-UI parses it (`@primoria/contracts/agent-input-limits`); the Agent also caps bodies at 5 MB. | 2026-12-31 |

## 2026-10-24 Review

The npm production bulk audit no longer reports either of the findings that
had a 2026-10-12 review date (`GHSA-w5hq-g745-h8pq` / uuid and
`GHSA-866g-f22w-33x8` / provider-utils). They are closed for the installed
production dependency tree, rather than carried forward with an expired date.
The fast-uri, ip-address, fast-copy and KaTeX findings are patched above.

The remaining Zod 3 exception expires on 2026-12-31. Registry metadata checked
on 2026-10-24 still has CopilotKit runtime 1.79.1 depending on Zod 3; a global
Zod 4 substitution still requires upstream type interoperability. Recheck by
2026-11-24. `audit:prod` continues to fail automatically after the exception
expires and for any non-excepted advisory/version combination.
