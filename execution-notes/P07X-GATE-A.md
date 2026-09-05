# P07X-GATE-A — Identity/authorization invariant gate

Status: PASSED — all 12 checks green, continuing to T05.

## Evidence

| # | Invariant | Evidence | Result |
|---|-----------|----------|--------|
| 1 | Same User can select Platform Admin, matching Domain Admin, and ordinary Character | `GATE-A-1` in `src/lib/authz/phase7xIdentityAcceptance.test.ts` (selector list = domain_admin + platform_admin + player) | PASS |
| 2 | Ordinary Character does not inherit either admin authority | `T02 ordinary Character does not inherit User platform/owner authority` (same file) | PASS |
| 3 | Platform Admin cannot mutate ordinary Domain Documents | `T02 Platform Administrator cannot create/edit/file an ordinary Domain Document` | PASS |
| 4 | Domain Admin cannot use platform-only operations | `T02 domain_admin cannot pass the platform authorization seam`; `T02 platform_admin ... passes the platform seam` | PASS |
| 5 | Domain Admin of Ar cannot administer another Domain | `T02 Administrator of Ar cannot operate a second Domain` | PASS |
| 6 | Admin kinds cannot receive Roles/Memberships/claims | `characterKinds.test.ts`: memberships/role-assignments rejected; claims fail closed | PASS |
| 7 | Type grant works without Folder grant | `T03 Role Type grant works without any Folder grant` | PASS |
| 8 | Folder grant cannot manufacture missing Type record permission | `T03 Folder-read grant alone does not expose inaccessible Type documents` | PASS |
| 9 | Folder deny can narrow Type authority | `T03 Folder deny narrows a Type grant` | PASS |
| 10 | Folder tree does not leak inaccessible Document counts/names | `T04 Warrior sees Incident workflow Folders, not Property Deeds` + `T04 Folder-read grant without Type read exposes the container only` (server-side projection counts) | PASS |
| 11 | Legacy domain-admins rows do not authorize | `T02 legacy domain-admins rows do not authorize a different acting Character` | PASS |
| 12 | Direct collection/API boundaries remain fail-closed | `accessBoundary.test.ts` 4/4 (forged REST/local mutations denied; sanctioned seams work) | PASS |

## Suite totals

- `test:p07x-t02` 9/9 (incl. new GATE-A-1)
- `test:p07x-kinds` 9/9
- `test:p07x-t03` 7/7
- `test:p07x-t04` 4/4
- `test:security` full chain 32/32 (accessBoundary 4, supersession 12, concurrency 1, peopleWorkspace 7, domainRemoval 7, domainRemovalLarge 1)
- `npm test` 114/114; `tsc --noEmit` clean

Gate is green — no owner acknowledgment required; proceeding to T05.