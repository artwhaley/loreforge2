# Phase 1 review — editor, theme, and safety foundation

**Review status: APPROVED_BY_OWNER**

This is an inspection report, not a self-approval. The owner confirmed GS-01 and GS-02 were good and approved the documented Phase 1 caveats in chat on 2026-09-02.

## Revision under review

- Branch: `phase-01-editor-theme-safety`
- Approved starting point/tag: `mvp-baseline` at `b92b6f054f22c6ad28e23f00de7926603fb383d7`
- Phase commits: `5eeabe9`/`4a643c4` (P01-T01), `f951432`/`3a5415e` (P01-T02), `e179122`/`bb232b0` (P01-T03), `e36c5b6`/`13f9008` plus scoped fixture repair `c0221d2` (P01-T04)
- Working tree: clean at review time.

## Automated evidence

- `npm test`: **32 passed**.
- `npx tsc --noEmit`: **passed**.
- `npm run build`: **passed**.
- `npm run seed`: **passed** after the scoped P01-T04 fixture repair; clean reset media now rasterizes to PNG.
- `npx eslint src --max-warnings=0`: **blocked by pre-existing repository configuration**. ESLint 9 fails while loading `eslint.config.mjs` because `core-web-vitals` is undefined; no lint source finding was produced and the config was not changed.
- Malicious Markdown corpus: **no active payload** in the regression suite. Raw script/HTML/event attributes are escaped or removed; encoded/obfuscated `javascript:`, `vbscript:`, `data:`, and protocol-relative links are rejected; benign angle-bracket prose remains visible.
- Theme media corpus: valid JPEG/PNG/WebP accepted and re-encoded; SVG, malformed data, declared MIME/extension spoofing, >5 MiB, >4096 dimension, and trailing-polyglot inputs rejected. Multi-page metadata is rejected by the validator; a dedicated animated fixture is deferred because the non-browser test harness cannot produce one without adding a new image fixture dependency.

## Golden scenarios

### GS-01 — canonical edit

The automated fixture performs three LF-normalization/source-boundary cycles over headings, nested lists, blockquotes, tables, links, horizontal rules, and blank-line structure; all structure assertions pass. The editor retains MDXEditor as the WYSIWYG and the custom Source textarea remains verbatim. No supported Markdown corruption was reproduced in this canonical/render seam.

Owner manual evidence is still required: WYSIWYG edit → Source edit → WYSIWYG → save/reopen, including keyboard reachability of Source and Save. A live browser/owner session was unavailable in this execution environment, so runtime MDXEditor corruption is **not proven absent**.

### GS-02 — theme identity

The Heritage and Modern presets are intentionally distinct; both the shell preview and representative Document preview consume the same semantic CSS variables, while preview Markdown is passed through unchanged. Curated theme values are runtime-validated at the save boundary, and accepted media is decoded/re-encoded under the narrow image contract.

Owner manual evidence is still required: make the same Domain look traditional and then strongly modern in Theme Studio, confirm shell and Document both update, and verify logo/banner controls and Save are discoverable. No live browser session or screenshots were available; screenshot evidence is therefore **not supplied**.

## Defects and patch instructions

1. **P1 — owner gate evidence missing (blocks approval).** GS-01/GS-02 require an owner’s direct UX judgment and screenshots. Run the two scenarios in a browser, record pass/fail and screenshots, then amend this report and rerun the gate if a defect appears.
2. **P1 — programmatic App Router navigation is not generically interceptable.** The editor guard protects refresh/close and same-origin anchor/Next `<Link>` clicks in the capture phase. A future caller using `router.push`/`router.replace` directly would bypass that guard. Before relying on such navigation from an editor, add an approved App Router transition guard or explicitly constrain the contract to link navigation and document the decision.
3. **P2 — runtime table stability is not browser-proven.** The supported table control remains enabled and canonical/render fixtures pass, but the ticket’s three Edit→Source→Edit→save/reopen runtime criterion needs owner browser evidence. If drift appears, remove only the table control and record the exact repro; do not replace MDXEditor in the executor.
4. **P2 — animated-image fixture is deferred.** The validator rejects `metadata.pages > 1`; add a fixture or live test for an animated WebP/PNG before treating media acceptance as complete if animation handling is a release blocker.
5. **P2 — lint tooling remains broken.** Repair `eslint.config.mjs`/dependency compatibility in a separately scoped tooling ticket; it is not a Phase 1 product defect and was not silently altered here.

## Form Builder review

See [`P01-FORM-BUILDER-OBSERVATIONS.md`](P01-FORM-BUILDER-OBSERVATIONS.md). Generic email/confirmation/payment/upload-provider and Payload admin controls are explicitly deferred from the customer Form Studio; neutral field metadata and a server-side submission seam are retained for P06.

## Gate decision

The owner approved GS-01 and GS-02 and accepted the documented caveats on 2026-09-02. Phase 1 is complete; the P1 navigation note remains a follow-up constraint for any future programmatic router transition.
