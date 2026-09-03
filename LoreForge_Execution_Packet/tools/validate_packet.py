#!/usr/bin/env python3
from pathlib import Path
import re, sys, hashlib

ROOT=Path(__file__).resolve().parents[1]
TROOT=ROOT/"tickets"

REQUIRED_ROOT=[
    "00_START_HERE.md","01_ORCHESTRATOR.md","02_FROZEN_PRODUCT_DECISIONS.md",
    "03_ARCHITECTURE_CONTRACT.md","04_SPIKE_BASELINE.md",
    "05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md","06_CHANGE_CONTROL.md",
    "07_TICKET_INDEX.md","08_EXECUTOR_KICKOFF_PROMPT.md",
    "09_REVIEW_KICKOFF_PROMPT.md","10_PACKET_MANIFEST.md","REVIEW_AGENT_BRIEF.md",
]
REQUIRED_REFS=[
    "FULL_PRODUCT_SPEC.md","STALE_LOREFORGE_FUNCTIONAL_SPEC.md",
    "SPIKE_MVP_REVIEW.md","SPIKE_README.md","SPIKE_SOURCE_MANIFEST.md",
    "SPIKE_ORIGINAL_BUILD_SPEC.md","SPIKE_ORIGINAL_EXECUTION_STACK.md",
    "SPIKE_ORIGINAL_TEST_FIXTURES.md","sl-civic-archive-mvp-source.zip",
]
REQUIRED_SECTIONS=[
    "Objective","Required pre-read","Depends on","Frozen context for this ticket",
    "Required work","Likely code touchpoints","Automated acceptance",
    "Manual acceptance","Guardrails / non-goals","Completion handoff",
]
STD_GUARDS=[
    "Do not advance work scheduled for a later phase",
    "Do not introduce a new framework/provider/abstraction",
    "Keep customer-facing language free of Payload/CMS schema terminology",
    "Preserve passing behavior outside this ticket",
    "Commit this ticket separately",
]

def section(txt,name):
    m=re.search(rf"^## {re.escape(name)}\n(.*?)(?=^## |\Z)",txt,re.M|re.S)
    return m.group(1).strip() if m else None

errors=[]
warnings=[]

for rel in REQUIRED_ROOT:
    if not (ROOT/rel).is_file(): errors.append(f"missing root file: {rel}")
for rel in REQUIRED_REFS:
    if not (ROOT/"references"/rel).is_file(): errors.append(f"missing reference: {rel}")
for rel in ["P00_MVP_BASELINE_APPROVAL.md","P10_DEPLOYMENT_DECISIONS.md","P11_BILLING_DECISIONS.md","P15_SL_PROTOCOL_APPROVAL.md"]:
    if not (ROOT/"owner-gates"/rel).is_file(): errors.append(f"missing owner gate: {rel}")

phase_dirs=[TROOT/f"phase-{p:02d}" for p in range(1,16)]
for d in phase_dirs:
    if not d.is_dir(): errors.append(f"missing phase dir: {d.relative_to(ROOT)}")
    elif not (d/"00_PHASE_ORCHESTRATOR.md").is_file():
        errors.append(f"missing phase orchestrator: {d.relative_to(ROOT)}")

ticket_files=sorted([
    p for p in TROOT.rglob("*.md")
    if p.name!="00_PHASE_ORCHESTRATOR.md"
])
if len(ticket_files)!=83:
    errors.append(f"expected 83 ticket files, found {len(ticket_files)}")

records={}
phase_impl={p:[] for p in range(1,16)}
phase_gate={}

for f in ticket_files:
    txt=f.read_text(encoding="utf-8")
    hm=re.search(r"^#\s+([A-Z0-9-]+)\s+—\s+(.+)$",txt,re.M)
    if not hm:
        errors.append(f"{f}: malformed title"); continue
    tid=hm.group(1)
    if tid in records: errors.append(f"duplicate ticket id {tid}")
    pm=re.search(r"^\*\*Phase:\*\*\s*(\d+)\s*$",txt,re.M)
    mm=re.search(r"^\*\*Mode:\*\*\s*(.+?)\s*$",txt,re.M)
    cm=re.search(r"^\*\*Commit prefix:\*\*\s*`([^`]+)`",txt,re.M)
    if not pm or not mm or not cm:
        errors.append(f"{tid}: missing Phase/Mode/Commit prefix"); continue
    phase=int(pm.group(1)); mode=mm.group(1)
    expected_dir=f"phase-{phase:02d}"
    if f.parent.name!=expected_dir:
        errors.append(f"{tid}: phase says {phase}, file is in {f.parent.name}")
    if not cm.group(1).startswith(tid+":"):
        errors.append(f"{tid}: commit prefix {cm.group(1)!r} does not match ticket id")
    for s in REQUIRED_SECTIONS:
        if section(txt,s) is None:
            errors.append(f"{tid}: missing section {s}")
    pre=section(txt,"Required pre-read") or ""
    phase_orch=f"`tickets/phase-{phase:02d}/00_PHASE_ORCHESTRATOR.md`"
    if phase_orch not in pre:
        errors.append(f"{tid}: phase orchestrator absent from Required pre-read")
    guard=section(txt,"Guardrails / non-goals") or ""
    for g in STD_GUARDS:
        if g not in guard:
            errors.append(f"{tid}: standard guardrail missing: {g}")
    touch=section(txt,"Likely code touchpoints") or ""
    auto=section(txt,"Automated acceptance") or ""
    manual=section(txt,"Manual acceptance") or ""
    # Catch the known generation-shift failure.
    if "Do not " in touch and not any(x in touch for x in ("src/","docs/","package","Inspect current")):
        errors.append(f"{tid}: Likely code touchpoints still appears to contain guardrails")
    auto_bullets=re.findall(r"(?m)^-\s+(.+)$",auto)
    if not auto_bullets:
        errors.append(f"{tid}: automated acceptance must contain at least one bullet assertion")
    elif all(re.fullmatch(r"`?(?:src|deployment|scripts|docs)/[^`]+`?",b.strip()) for b in auto_bullets):
        errors.append(f"{tid}: Automated acceptance appears to be only code paths")
    if not auto.strip():
        errors.append(f"{tid}: empty automated acceptance")
    if not manual.strip():
        errors.append(f"{tid}: empty manual acceptance")
    records[tid]={"phase":phase,"mode":mode,"file":f,"deps":section(txt,"Depends on") or ""}
    if "REVIEW GATE" in mode:
        if phase in phase_gate: errors.append(f"phase {phase}: multiple gates")
        phase_gate[phase]=tid
    else:
        phase_impl[phase].append(tid)

if len(records)!=83: errors.append(f"parsed {len(records)} ticket records, expected 83")
if len(phase_gate)!=15: errors.append(f"expected 15 review gates, found {len(phase_gate)}")
if sum(len(v) for v in phase_impl.values())!=68:
    errors.append(f"expected 68 implementation/design tickets, found {sum(len(v) for v in phase_impl.values())}")

# Dependency references must resolve; gates must name every phase implementation ticket.
for tid,r in records.items():
    refs=set(re.findall(r"\bP\d{2}-(?:T\d{2}|GATE)\b",r["deps"]))
    for dep in refs:
        if dep not in records:
            errors.append(f"{tid}: unresolved dependency id {dep}")
        elif records[dep]["phase"]>r["phase"]:
            errors.append(f"{tid}: depends on future ticket {dep}")
    if "REVIEW GATE" in r["mode"]:
        missing=[x for x in phase_impl[r["phase"]] if x not in refs]
        if missing:
            errors.append(f"{tid}: gate does not explicitly depend on all phase tickets: {missing}")

# Phase orchestrators must name all tickets and STOP.
for p in range(1,16):
    f=TROOT/f"phase-{p:02d}"/"00_PHASE_ORCHESTRATOR.md"
    if not f.exists(): continue
    txt=f.read_text(encoding="utf-8")
    ids=[tid for tid,r in records.items() if r["phase"]==p]
    for tid in ids:
        if tid not in txt: errors.append(f"phase {p} orchestrator missing {tid}")
    if "STOP" not in txt: errors.append(f"phase {p} orchestrator lacks hard STOP language")
    if f"P{p:02d}-GATE" not in txt: errors.append(f"phase {p} orchestrator lacks gate id")

# Critical content assertions that should never regress silently.
critical={
    ROOT/"02_FROZEN_PRODUCT_DECISIONS.md":[
        "One LoreForge User may link to **zero or one** Second Life account/avatar",
        "Character",
        "Personal Domain",
        "supersedes",
    ],
    ROOT/"03_ARCHITECTURE_CONTRACT.md":[
        "Authorization precedence",
        "Copy/move/share contract",
        "Raw HTML is **not** a supported feature",
        "PostgreSQL",
    ],
    ROOT/"04_SPIKE_BASELINE.md":[
        "Marked",
        "SQLite",
        "Form Builder",
        "temporary",
    ],
}
for f,needles in critical.items():
    txt=f.read_text(encoding="utf-8")
    for n in needles:
        if n.lower() not in txt.lower(): errors.append(f"{f.name}: critical phrase missing: {n}")

# Review brief references must exist.
review=(ROOT/"REVIEW_AGENT_BRIEF.md").read_text(encoding="utf-8")
for rel in ["references/FULL_PRODUCT_SPEC.md","references/SPIKE_MVP_REVIEW.md",
            "references/SPIKE_SOURCE_MANIFEST.md","07_TICKET_INDEX.md",
            "references/sl-civic-archive-mvp-source.zip"]:
    if rel not in review: errors.append(f"REVIEW_AGENT_BRIEF missing reference to {rel}")

# Every ticket path printed in the navigation index must resolve.
index_text=(ROOT/"07_TICKET_INDEX.md").read_text(encoding="utf-8")
for rel in sorted(set(re.findall(r"`(tickets/[^`]+\.md)`",index_text))):
    if not (ROOT/rel).is_file():
        errors.append(f"07_TICKET_INDEX lists missing ticket path: {rel}")

# SHA256SUMS is an exact byte-integrity contract. Review working material is
# deliberately non-authoritative and excluded; do not normalize line endings or
# whitespace because that would hide real drift.
sums_file=ROOT/"SHA256SUMS.txt"
if not sums_file.is_file():
    errors.append("missing SHA256SUMS.txt")
else:
    expected_hashes={}
    for lineno,line in enumerate(sums_file.read_text(encoding="utf-8").splitlines(),1):
        if not line.strip():
            continue
        m=re.fullmatch(r"([0-9a-fA-F]{64})  \./(.+)",line)
        if not m:
            errors.append(f"SHA256SUMS.txt:{lineno}: malformed entry")
            continue
        rel=m.group(2).replace("\\","/")
        if rel in expected_hashes:
            errors.append(f"SHA256SUMS.txt:{lineno}: duplicate entry {rel}")
        expected_hashes[rel]=m.group(1).lower()

    authoritative={
        p.relative_to(ROOT).as_posix()
        for p in ROOT.rglob("*")
        if p.is_file()
        and p.name!="SHA256SUMS.txt"
        and "review findings" not in p.relative_to(ROOT).parts
        and "__pycache__" not in p.relative_to(ROOT).parts
    }
    missing_hashes=sorted(authoritative-set(expected_hashes))
    stale_hashes=sorted(set(expected_hashes)-authoritative)
    for rel in missing_hashes:
        errors.append(f"SHA256SUMS.txt missing authoritative file: {rel}")
    for rel in stale_hashes:
        errors.append(f"SHA256SUMS.txt lists absent/non-authoritative file: {rel}")
    for rel in sorted(authoritative & set(expected_hashes)):
        actual=hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()
        if actual!=expected_hashes[rel]:
            errors.append(f"SHA-256 mismatch: {rel}")

if errors:
    print("PACKET VALIDATION: FAIL")
    for e in errors: print("ERROR:",e)
    if warnings:
        for w in warnings: print("WARN:",w)
    sys.exit(1)
print("PACKET VALIDATION: PASS")
print(f"ticket files: {len(ticket_files)}")
print(f"implementation/design tickets: {sum(len(v) for v in phase_impl.values())}")
print(f"review gates: {len(phase_gate)}")
print("phases: 15")
print("references: complete")
