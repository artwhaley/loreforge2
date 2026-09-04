<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LoreForge product-contract rules

- Treat the owner's accepted product decisions and the current ticket as the complete feature boundary. Do not invent fields, labels, actions, modes, relationships, dashboards, or workflow steps because they seem useful or appear in an older ticket.
- Before changing a customer page, preserve the requested information hierarchy. The primary noun/content belongs first; controls belong only where the owner explicitly placed them. Do not add explanatory “app-shaped” copy, diagnostic panels, or duplicate navigation.
- A feature removed by the owner is removed from customer UI, routes/actions, and active ticket/gate instructions. Do not reintroduce it from stale packet text without an explicit owner decision.
- When an older spec conflicts with a direct owner instruction, the owner instruction wins. Update the affected ticket/gate text so the same feature is not recreated by the next execution pass.
- For ambiguous product behavior, implement the narrowest behavior that satisfies the explicit request and record the assumption in the relevant execution note; do not broaden scope silently.
