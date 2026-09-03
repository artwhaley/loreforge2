# Clean-Context Review Kickoff Prompt

Copy/paste the text below to a review agent together with this entire packet **before execution**.

---

Review this LoreForge execution packet for readiness. Do not implement code and do not redesign the product.

First run `python tools/validate_packet.py`. Then read `REVIEW_AGENT_BRIEF.md` and follow its required read order. Treat `02_FROZEN_PRODUCT_DECISIONS.md` and `03_ARCHITECTURE_CONTRACT.md` as decisions already made by the owner. Use `references/FULL_PRODUCT_SPEC.md` for the complete intended shape and `04_SPIKE_BASELINE.md` + `references/SPIKE_MVP_REVIEW.md` + `references/SPIKE_SOURCE_MANIFEST.md` to understand what the completed spike actually proved.

Audit for:
- any ticket that leaves product or architecture decisions to the executor;
- contradictions between tickets, frozen decisions, phase ordering, and gates;
- accidental hardening of spike-only schema/infrastructure;
- data-loss or provenance holes;
- ambiguous Copy/Move/Share/Supersedes behavior;
- ambiguous User vs Character authority;
- permission precedence/delegation mistakes;
- customer UX work deferred past the point where deeper code depends on it;
- premature provider/SL choices;
- missing acceptance tests or impossible dependencies.

Use only BLOCKER / IMPORTANT / MINOR findings with file/ticket, exact evidence, why it matters, and a concrete patch that preserves owner decisions.

If no BLOCKER or IMPORTANT issue remains, conclude exactly: **ready to begin Phase 1 only**.

---
