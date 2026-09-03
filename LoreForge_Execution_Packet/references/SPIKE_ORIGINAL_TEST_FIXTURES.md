# SL Civic Archive - Fixed MVP Test Fixtures

Use these fixtures during implementation. Do not spend ticket time inventing richer fake cities or content.

---

# 1. Users

## Morgan Vale - multi-city admin

- local email: `admin@example.test`
- role in Ravenhurst: admin
- role in Port Victoria: admin

Use an obvious local-only password documented in the repository seed/readme. It is test data, not a secret.

## Alex Mercer - officer/member

- local email: `officer@example.test`
- role in Ravenhurst: member
- no Port Victoria membership required

---

# 2. Tenant A - Ravenhurst

## Identity

- name: `City of Ravenhurst`
- slug: `ravenhurst`
- motto: `Order, Service, Community`

## Theme direction

Traditional/dark civic character.

Suggested seed values:

- preset: `heritage`
- primary: `#243145`
- secondary: `#8A6A3C`
- accent: `#B9975B`
- background: `#F3EFE6`
- heading font key: choose one curated traditional serif available in the project
- body font key: choose one highly readable curated sans-serif or serif

Do not spend time sourcing copyrighted branding. Create simple placeholder seal/banner assets locally if needed.

## Departments

- City Hall
- Police Department
- Municipal Court

## Folders

```text
City Records
Police
  Reports
Court
  Filings
Ordinances
```

---

# 3. Tenant B - Port Victoria

## Identity

- name: `Port Victoria`
- slug: `port-victoria`
- motto: `Forward Together`

## Theme direction

Contemporary coastal/metropolitan character and visibly different from Ravenhurst.

Suggested seed values:

- preset: `modern`
- primary: `#123C5A`
- secondary: `#E8EDF1`
- accent: `#21A4B8`
- background: `#F8FAFC`
- heading font key: curated modern sans-serif
- body font key: curated readable sans-serif

## Departments

- Administration
- Public Safety
- Harbor Authority

## Folders

```text
Public Records
Public Safety
  Reports
Harbor Authority
Council
```

---

# 4. Shared Markdown rendering fixture

Render this exact content under both tenant themes during Ticket 01/03 review.

```md
# Incident Report 2026-014

**Reporting Officer:** Alex Mercer  
**Date:** September 1, 2026  
**Location:** 118 Market Street  
**Classification:** Property Damage

## Narrative

At approximately 9:35 PM, I responded to a report of property damage at 118 Market Street. On arrival, I observed a broken front window and spoke with the property occupant.

The occupant reported hearing an impact shortly before discovering the damage. No injuries were reported.

## Persons Contacted

- Jordan Resident - property occupant
- Casey Witness - nearby resident

## Disposition

Photographs were taken and the incident was documented for follow-up.

> This report is an MVP fixture used to evaluate formatting, editing, search, and tenant-specific presentation.
```

---

# 5. Editor round-trip stress fixture

Use this document to check the WYSIWYG/source round trip.

```md
# City Council Meeting Notes

## Attendance

- Mayor Morgan Vale
- Clerk Jamie North
- Councilor Avery Stone

## Agenda

1. Call to order
2. Harbor permit discussion
3. Public comments
4. Adjournment

The council discussed **Permit PV-2026-22** and agreed that the revised application should be reviewed at the next meeting.

For background, see [Permit Guidance](https://example.invalid/permit-guidance).

> Clerk's note: no final action was taken.

---

Meeting adjourned at 8:42 PM.
```

Expected behavior: semantic Markdown may be normalized, but content and structure must survive.

---

# 6. Ravenhurst About page fixture

```md
# About Ravenhurst

Ravenhurst is a roleplay community centered on municipal life, public service, and collaborative storytelling.

This archive provides residents and city staff with a shared home for public records, departmental documents, and other civic material created during roleplay.

## City Services

- City administration
- Police services
- Municipal court
- Public records
```

---

# 7. Incident Report form template

## Form name

`Incident Report`

## Destination

`Ravenhurst / Police / Reports`

## Fields

1. `incident_date`
   - label: Incident Date
   - type: date
   - required: yes

2. `officer_name`
   - label: Reporting Officer
   - type: short text
   - required: yes

3. `location`
   - label: Location
   - type: short text
   - required: yes

4. `incident_type`
   - label: Incident Type
   - type: select
   - required: yes
   - options:
     - Property Damage
     - Disturbance
     - Traffic Stop
     - Medical Assist
     - Other

5. `persons_involved`
   - label: Persons Involved
   - type: long text
   - required: no

6. `narrative`
   - label: Narrative
   - type: long text
   - required: yes

7. `follow_up_required`
   - label: Follow-up Required
   - type: checkbox
   - required: no

## Output title template

```text
{{incident_type}} Report - {{incident_date}}
```

## Output Markdown template

```md
# {{incident_type}} Report

**Date:** {{incident_date}}  
**Reporting Officer:** {{officer_name}}  
**Location:** {{location}}

## Persons Involved

{{persons_involved}}

## Narrative

{{narrative}}

## Follow-up Required

{{follow_up_required}}
```

---

# 8. Form submission fixture

Use this exact submission during final acceptance testing.

- Incident Date: `2026-09-01`
- Reporting Officer: `Alex Mercer`
- Location: `118 Market Street`
- Incident Type: `Property Damage`
- Persons Involved: `Jordan Resident; Casey Witness`
- Narrative: `Responded to a report of a damaged storefront window. No injuries were reported. Photographs were taken and the property occupant was advised that the report would be filed for follow-up.`
- Follow-up Required: checked

Expected generated title:

```text
Property Damage Report - 2026-09-01
```

---

# 9. Simulated Second Life notecard import fixture

Paste this exact Markdown through the simulated SL import surface.

```md
# Patrol Contact Report

**Officer:** Alex Mercer  
**Date:** September 1, 2026  
**Location:** Ravenhurst Square

## Contact

Spoke with a resident regarding a noise complaint near the square. The resident agreed to lower the volume and no further action was required.

## Disposition

Closed without citation.
```

Import destination:

`Ravenhurst / Police / Reports`

Expected origin:

`markdown-import`

Search verification phrase:

`noise complaint`

---

# 10. Final visual contrast check

During final review, open the same or equivalent police-style document under both tenants.

The test passes only if a casual observer can immediately tell that the two archives belong to different cities while still recognizing them as the same underlying product.

Do not solve this by creating entirely different page markup per tenant. The contrast must come primarily from tenant identity/theme data.
