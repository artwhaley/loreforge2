import type { DomainShellModel } from "../contracts/shell";
import type { HomePageModel } from "../contracts/home";
import type { RecordsPageModel } from "../contracts/records";
import type { DocumentPageModel } from "../contracts/document";
import type { Action } from "../controls";

// TEMPORARY INCUBATION FIXTURES. No database, authentication or network behavior.
export const base = "/domain/aster-reach";
export const shell: DomainShellModel = {
  domain: {
    id: 1,
    slug: "aster-reach",
    name: "Aster Reach",
    motto: "What we remember, we become.",
    logoUrl: null,
    bannerUrl: null,
    backgroundUrl: null,
  },
  primaryNavigation: [
    { label: "Home", segment: "", href: base },
    { label: "About", segment: "about", href: `${base}/about` },
    { label: "Lore", segment: "lore", href: `${base}/lore` },
    {
      label: "Departments",
      segment: "departments",
      href: `${base}/departments`,
    },
    { label: "Records", segment: "records", href: `${base}/records` },
  ],
  managementNavigation: [
    { label: "People", segment: "people", href: `${base}/manage/people` },
    { label: "Roles", segment: "roles", href: `${base}/roles` },
    { label: "Folders", segment: "folders", href: `${base}/manage/folders` },
    {
      label: "Departments",
      segment: "departments",
      href: `${base}/manage/departments`,
    },
    {
      label: "Document types",
      segment: "types",
      href: `${base}/document-types`,
    },
    { label: "Customize", segment: "customize", href: `${base}/customize` },
  ],
  operatingContext: {
    platformLabel: "LoreForge",
    availableDomains: [{ id: 1, slug: "aster-reach", name: "Aster Reach" }],
    activeDomainId: 1,
    availableCharacters: [{ id: 1, name: "Elara Voss" }],
    activeCharacterId: 1,
    account: { name: "Morgan", email: "morgan@example.test" },
  },
  routes: { baseUrl: base, workUrl: `${base}/work` },
};
const titles = [
  ["The Northwatch Accord", "Accord", 1, "filed", "Elara Voss"],
  ["A survey of the outer islands", "Field report", 3, "filed", "Cael Ren"],
  [
    "Minutes of the autumn assembly",
    "Council minutes",
    2,
    "submitted",
    "Mira Sol",
  ],
  ["On the keeping of names", "Charter", 1, "filed", "Elara Voss"],
  ["The return of the Wayfarer", "Field report", 4, "draft", "Cael Ren"],
  ["Stewardship of the eastern passage", "Charter", 2, "filed", "Sera Vale"],
  ["The first Northwatch agreement", "Accord", 5, "deprecated", "Elara Voss"],
  [
    "Soundings beyond the silver shoals",
    "Field report",
    3,
    "filed",
    "Cael Ren",
  ],
  [
    "Appointments to the winter council",
    "Council minutes",
    2,
    "filed",
    "Mira Sol",
  ],
  ["A record of the lighthouse keepers", "Charter", 4, "filed", "Sera Vale"],
  [
    "Concerning the restoration of the northern observatory and its adjoining public archive",
    "Council minutes",
    2,
    "draft",
    "Mira Sol",
  ],
  ["The crossing at first light", "Field report", 4, "filed", "Cael Ren"],
] as const;
export const archive: RecordsPageModel = {
  baseUrl: base,
  domainSlug: "aster-reach",
  totalReadableRecordCount: 72,
  folders: [
    {
      id: 1,
      name: "Foundations",
      systemManaged: false,
      readableRecordCount: 18,
      children: [
        {
          id: 5,
          name: "Earlier agreements",
          systemManaged: false,
          readableRecordCount: 6,
          children: [],
        },
      ],
    },
    {
      id: 2,
      name: "The council",
      systemManaged: false,
      readableRecordCount: 24,
      children: [],
    },
    {
      id: 3,
      name: "Expeditions",
      systemManaged: false,
      readableRecordCount: 12,
      children: [],
    },
    {
      id: 4,
      name: "People & places",
      systemManaged: false,
      readableRecordCount: 18,
      children: [],
    },
  ],
  records: Array.from({ length: 72 }, (_, i) => {
    const title = titles[i % titles.length];
    return {
      id: i + 1,
      title: title[0] + (i >= 12 ? ` · Volume ${Math.floor(i / 12) + 1}` : ""),
      folderId: title[2],
      documentTypeId:
        ["Accord", "Field report", "Council minutes", "Charter"].indexOf(
          title[1],
        ) + 1,
      updatedAt: `2026-${String(9 - Math.floor(i / 28)).padStart(2, "0")}-${String(28 - (i % 28)).padStart(2, "0")}T12:00:00Z`,
      preparedBy: title[4],
      lifecycle: title[3],
      locked: i === 3,
      capabilities: {
        read: true,
        edit: title[3] === "draft",
        supersede: title[3] === "filed",
        delete: true,
      },
    };
  }),
  documentTypes: [
    { id: 1, name: "Accord" },
    { id: 2, name: "Field report" },
    { id: 3, name: "Council minutes" },
    { id: 4, name: "Charter" },
  ],
  supersessionEdges: [{ newerId: 1, olderId: 7 }],
  query: { folderId: null, search: "" },
  capabilities: {
    manageFolders: true,
    actOnRecords: true,
    deleteRecords: true,
  },
  vocabulary: {
    documentSingular: "Document",
    documentPlural: "Documents",
    folderPlural: "Folders",
  },
};
export const home: HomePageModel = {
  baseUrl: base,
  domain: { name: shell.domain.name, motto: shell.domain.motto },
  welcome: {
    html: "<p>At the edge of the known sea, a community takes shape. These are the stories, agreements, and discoveries that make it ours.</p><p>Welcome to Aster Reach. Explore our world, meet its people, and follow the record as it grows.</p>",
    editHref: `${base}/pages/home/edit`,
  },
  destinations: shell.primaryNavigation.filter((nav) => nav.segment !== ""),
  recentRecords: archive.records
    .slice(0, 3)
    .map((record) => ({
      id: record.id,
      title: record.title,
      type: archive.documentTypes.find(
        (type) => type.id === record.documentTypeId,
      )!.name,
      activity: "September 7, 2026",
    })),
};
const sections = [
  {
    title: "01. A common shore",
    paragraphs: [
      "We came to the Reach by different waters. Some carried the names of places that no longer appear on any chart. Some brought little more than a trade, a promise, or a reason to begin again. What joined us was not a shared past, but the possibility of a shared future.",
      "This accord sets down the terms by which we hold that future together. It is an agreement between the settlements of Northwatch, the eastern passage, and the outer islands: that the coast shall remain open, that its records shall be kept in common, and that no person’s place in our story shall depend upon the strength of their voice.",
      "The archive is not the property of those who keep it. It belongs to the community whose life it records. Its stewards accept a duty of care, not a claim of ownership.",
    ],
  },
  {
    title: "02. The work of keeping",
    paragraphs: [
      "A record should allow those who were absent to understand what took place. It should distinguish what was witnessed from what was reported, what was decided from what was proposed, and what is known from what remains uncertain.",
      "Every agreement entered into the archive shall name its preparer and identify the people or offices it concerns. Supporting accounts may be attached through the ordinary record process. A missing account does not become evidence merely because it would make a story easier to tell.",
      "The stewards shall preserve earlier agreements when a new one replaces them. An old record may cease to govern our actions, but it does not cease to explain them. The chain between one agreement and the next must remain intelligible.",
    ],
  },
  {
    title: "03. Passage and shelter",
    paragraphs: [
      "The northern landing and the marked paths between the settlements are held for common use. Visitors may seek shelter at Northwatch without taking an oath of permanent residence. The harbor keeper shall make the terms of temporary mooring available before accepting a vessel.",
      "During storms, ordinary limits on the use of the lower storehouse may be suspended by the keeper on duty. Such a decision shall be recorded when conditions permit, with the reason for the suspension and the time at which ordinary practice resumed.",
      "Disputes over passage should first be heard by the people directly concerned. Where an agreement cannot be reached, either party may ask the council to hear the matter. No settlement may close a common path solely to strengthen its position in a dispute.",
    ],
  },
  {
    title: "04. Stewardship and review",
    paragraphs: [
      "The council shall appoint a steward for each shared place and publish the term of that appointment. A steward may arrange the daily work of a place, request assistance, and report conditions that require the council’s attention. The appointment does not grant powers beyond those recorded with it.",
      "At the autumn assembly, each steward shall present a short account of the year: what was repaired, what was lost, what remains unfinished, and what the next steward should know. These accounts are working records. They need not be polished to be useful.",
      "Any resident may bring a proposed correction to the attention of the archive. Where a correction changes the meaning of an agreement, a successor record shall be prepared. The earlier record shall remain linked so that the history of the decision can be followed.",
    ],
  },
  {
    title: "05. A continuing agreement",
    paragraphs: [
      "This accord replaces the first Northwatch agreement. It carries forward the promise of common shelter and clarifies the responsibilities of those who maintain our shared places. Existing appointments continue until their recorded terms expire.",
      "The accord shall be reviewed at the next autumn assembly. Before that meeting, proposed amendments may be entered as draft records for consideration. A proposal has no force merely because it appears beside a filed agreement in the archive.",
      "We sign with the understanding that a community is never finished. Its agreements must be sturdy enough to guide us and open enough to be improved by those who come after. Let this be a record of what we chose to hold in common, and a place from which they may begin.",
    ],
  },
];
const introduction =
  "An agreement on common ground, shared passage, and the care of the record. Adopted by the settlements of Aster Reach at the autumn assembly.";
const quote =
  "What we preserve is not only what happened, but the possibility of understanding one another.";
const bodyHtml = `<p class="lead">${introduction}</p>${sections.map((section, i) => `<h2>${section.title}</h2>${section.paragraphs.map((p) => `<p>${p}</p>`).join("")}${i === 0 ? `<blockquote>${quote}</blockquote>` : ""}`).join("")}<hr/><p>Entered into the archive by Elara Voss<br/>Northwatch · September 7, 2026</p>`;
const bodySource =
  introduction +
  "\n\n" +
  sections
    .map(
      (section, i) =>
        `## ${section.title}\n\n${section.paragraphs.join("\n\n")}${i === 0 ? "\n\n> " + quote : ""}`,
    )
    .join("\n\n") +
  "\n\n---\n\nEntered into the archive by Elara Voss  \nNorthwatch · September 7, 2026";
export const document: DocumentPageModel = {
  baseUrl: base,
  domainSlug: "aster-reach",
  recordId: 1,
  title: "The Northwatch Accord",
  bodyHtml,
  bodySource,
  meta: [
    { label: "Document type", value: "Accord" },
    { label: "Collection", value: "Foundations" },
    { label: "Filed", value: "September 7, 2026" },
    { label: "Prepared by", value: "Elara Voss" },
  ],
  lifecycle: "filed",
  locked: false,
  isSuperseded: false,
  supersession: {
    supersedes: { id: 7, title: "The first Northwatch agreement" },
    supersededBy: null,
  },
  concerns: [
    { name: "The Northwatch Council", relationshipLabel: "Adopting body" },
    { name: "Outer Islands", relationshipLabel: "Signatory" },
  ],
  tags: ["Foundations", "Common ground", "Governance"],
  preparedByLabel: "Elara Voss",
  capabilities: {
    edit: false,
    submit: false,
    file: false,
    approve: false,
    restore: false,
    deprecate: true,
    lock: true,
    unlock: false,
    delete: true,
    supersede: true,
  },
  routes: {
    editUrl: null,
    historyUrl: `${base}/documents/1/history`,
    supersedeUrl: `${base}/records/new?supersedes=1`,
  },
  statusMessage: null,
};
// Explicit fixture action lists. These are examples of authorized descriptors,
// not an alternative implementation of LoreForge lifecycle authorization.
export const recordActions: Record<number, Action[]> = Object.fromEntries(
  archive.records.map((record) => [
    record.id,
    [
      { key: "view", label: "View", href: `${base}/documents/${record.id}` },
      ...(record.lifecycle === "draft"
        ? [
            {
              key: "edit",
              label: "Edit",
              href: `${base}/documents/${record.id}/edit`,
            },
          ]
        : []),
      ...(record.lifecycle === "filed"
        ? [
            {
              key: "supersede",
              label: "Supersede",
              href: `${base}/records/new?supersedes=${record.id}`,
            },
          ]
        : []),
      { key: "delete", label: "Delete", danger: true },
    ],
  ]),
);
export const documentActions: Record<string, Action[]> = {
  filed: [
    { key: "history", label: "History" },
    { key: "supersede", label: "Supersede" },
    { key: "deprecate", label: "Deprecate" },
    { key: "lock", label: "Lock" },
    { key: "delete", label: "Delete", danger: true },
  ],
  draft: [
    { key: "edit", label: "Edit" },
    { key: "history", label: "History" },
    { key: "submit", label: "Submit for review" },
    { key: "file", label: "File now" },
    { key: "lock", label: "Lock" },
    { key: "delete", label: "Delete", danger: true },
  ],
  submitted: [
    { key: "history", label: "History" },
    { key: "approve", label: "Approve" },
    { key: "lock", label: "Lock" },
    { key: "delete", label: "Delete", danger: true },
  ],
  deprecated: [
    { key: "history", label: "History" },
    { key: "restore", label: "Restore" },
    { key: "delete", label: "Delete", danger: true },
  ],
};
