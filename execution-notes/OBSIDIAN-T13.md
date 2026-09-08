# OBSIDIAN-T13 — Public page wiring

Status: complete.

Changed Obsidian Home/About/Departments/Department adapters to consume production Page Models and config. Atmosphere uses the validated Design asset reference; fixture-era Aster Reach prose was removed, empty directories are rendered, and Department remains a member-directory fallback without inferred hierarchy.

Verification: `npx tsc --noEmit`, `npm run test:design`.

Deviation/pressure: no new Page Model facts were added for public-page ornament or organization-chart edges.
