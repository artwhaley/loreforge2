"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Collapsible, ToggleGroup } from "radix-ui";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Check,
  Folder,
  FolderOpen,
  Folders,
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  LockKeyhole,
  CornerDownRight,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import type { RecordsPageModel } from "@/lib/page-models/records";
import type { FolderSummary, RecordSummary } from "@/lib/page-models/common";
import type { ObsidianConfigV1 } from "@/lib/design/contracts";
import type { DesignConfigProps } from "@/lib/design/types";
import { useRecordsWorkspace } from "@/lib/records/workspace/useRecordsWorkspace";
import { useRecordActions } from "@/components/functional/records/recordActions";
import { ActionMenu, ChoiceMenu, Modal, type Action } from "./controls";
import s from "./obsidian.module.css";

/** Small presentation adapter; core hook remains the sole live behavior owner. */
export type RecordsViewState = {
  search: string;
  setSearch(value: string): void;
  selectedFolder: number | null;
  selectFolder(id: number | null): void;
  expandedFolders: ReadonlySet<number>;
  toggleFolder(id: number): void;
  includeSubfolders: boolean;
  setIncludeSubfolders(value: boolean): void;
  type: string;
  setType(value: string): void;
  view: "cards" | "list";
  setView(value: "cards" | "list"): void;
  sort: "newest" | "oldest" | "title-asc" | "title-desc";
  setSort(value: RecordsViewState["sort"]): void;
  pageSize: number;
  setPageSize(value: number): void;
  page: number;
  pageCount: number;
  setPage(value: number): void;
  records: RecordSummary[];
  resultCount: number;
  actions: Record<number, Action[]>;
  folderActions: Action[];
  onAction(action: Action, target?: RecordSummary): void;
};
export function ObsidianRecords(props: RecordsPageModel & DesignConfigProps<ObsidianConfigV1>) {
  const model = props;
  const { designConfig } = props;
  const [view, setView] = useState<RecordsViewState["view"]>(designConfig.records.defaultView);
  const [sort, setSort] = useState<RecordsViewState["sort"]>("newest");
  const [pageSize, setPageSize] = useState<number>(designConfig.records.defaultView === "cards" ? designConfig.records.cardPageSize : designConfig.records.listPageSize);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const core = useRecordsWorkspace(model, { pageSize: boundedPageSize(pageSize), sort: serverSort(sort) });
  const { deleteAction } = useRecordActions();
  const records = useMemo(() => {
    const sorted = [...core.results.records].sort((a, b) => {
      if (sort === "title-asc") return a.title.localeCompare(b.title);
      if (sort === "title-desc") return b.title.localeCompare(a.title);
      const order = String(a.updatedAt).localeCompare(String(b.updatedAt));
      return sort === "oldest" ? order : -order;
    });
    const count = Math.max(1, Math.ceil(sorted.length / pageSize));
    return { rows: sorted.slice((page - 1) * pageSize, page * pageSize), count };
  }, [core.results.records, page, pageSize, sort]);
  const ws: RecordsViewState = {
    search: core.search.value,
    setSearch: (value) => { core.search.setValue(value); setPage(1); },
    selectedFolder: core.folders.selectedId,
    selectFolder: (id) => { core.folders.select(id); setPage(1); },
    expandedFolders: core.folders.expandedIds,
    toggleFolder: core.folders.toggleExpanded,
    includeSubfolders: core.search.subfolders,
    setIncludeSubfolders: core.search.setSubfolders,
    type: core.exposure.typeId === null ? "all" : String(core.exposure.typeId),
    setType: (value) => { core.exposure.apply(value === "all" ? "" : value); setPage(1); },
    view,
    setView: (value) => { setView(value); setPageSize(value === "cards" ? designConfig.records.cardPageSize : designConfig.records.listPageSize); setPage(1); },
    sort,
    setSort: (value) => { setSort(value); setPage(1); },
    pageSize,
    setPageSize: (value) => { setPageSize(value); setPage(1); },
    page,
    pageCount: records.count,
    setPage: (value) => setPage(Math.max(1, Math.min(records.count, value))),
    records: records.rows,
    resultCount: core.results.records.length,
    actions: Object.fromEntries(core.results.records.map((record) => [record.id, recordActions(model, record, deleteAction)])),
    folderActions: [{ key: "manage-folders", label: "Manage folders", href: `${model.baseUrl}/manage/folders` }],
    onAction: (action, target) => {
      if (action.href) router.push(action.href);
      if (action.key === "delete" && target && deleteAction) {
        const form = new FormData();
        form.set("tenantSlug", model.domainSlug);
        form.set("documentId", String(target.id));
        void deleteAction(form);
      }
      if (action.key === "new") router.push(`${model.baseUrl}/records/new`);
      if (action.key === "import") router.push(`${model.baseUrl}/import`);
    },
  };
  const [foldersOpen, setFoldersOpen] = useState(false);
  function findFolder(folders: FolderSummary[]): FolderSummary | undefined {
    for (const folder of folders) {
      if (folder.id === ws.selectedFolder) return folder;
      const child = findFolder(folder.children);
      if (child) return child;
    }
  }
  const selectedFolder = findFolder(model.folders);
  function folderTree(folder: FolderSummary, depth = 0) {
    return (
      <Collapsible.Root
        key={folder.id}
        open={ws.expandedFolders.has(folder.id)}
        onOpenChange={() => ws.toggleFolder(folder.id)}
      >
        <div
          className={`${s.folderLine} ${ws.selectedFolder === folder.id ? s.selectedFolder : ""}`}
          style={{ paddingLeft: `${10 + depth * 16}px` }}
        >
          {folder.children.length > 0 ? (
            <Collapsible.Trigger
              className={s.folderExpand}
              aria-label={`${ws.expandedFolders.has(folder.id) ? "Collapse" : "Expand"} ${folder.name}`}
            >
              <ChevronRight size={13} />
            </Collapsible.Trigger>
          ) : (
            <span className={s.folderSpacer} />
          )}
          <button
            onClick={() => {
              ws.selectFolder(folder.id);
              setFoldersOpen(false);
            }}
          >
            {ws.selectedFolder === folder.id ? (
              <FolderOpen size={17} />
            ) : (
              <Folder size={17} />
            )}
            <span>{folder.name}</span>
            <small>{folder.readableRecordCount}</small>
          </button>
        </div>
        <Collapsible.Content>
          {folder.children.map((child) => folderTree(child, depth + 1))}
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }
  return (
    <div className={s.workspacePage}>
      <div className={s.pageHeading}>
        <div>
          <p className={s.eyebrow}>THE DOMAIN ARCHIVE</p>
          <h1>
            Records<span className={s.titleDot}>.</span>
          </h1>
          <p>Every story leaves a trace.</p>
        </div>
        <div className={s.pageActions}>
          {model.capabilities.actOnRecords && (
            <>
              <a className={s.secondaryButton} href={`${model.baseUrl}/import`}>
                <Upload size={16} />
                Import
              </a>
              <a className={s.primaryButton} href={`${model.baseUrl}/records/new`}>
                <Plus size={17} />
                New document
              </a>
            </>
          )}
        </div>
      </div>
      <div className={s.archive}>
        <aside className={s.folderPanel} aria-label="Archive folders">
          <div className={s.folderHeading}>
            <span className={s.eyebrow}>COLLECTIONS</span>
            {model.capabilities.manageFolders && (
              <ActionMenu
                label="Folder management"
                trigger={<MoreHorizontal size={18} />}
                items={ws.folderActions}
                onAction={(action) => ws.onAction(action)}
              />
            )}
          </div>
          {model.capabilities.manageFolders ? <div className={s.folderHeading}>
            <a href={`${model.baseUrl}/manage/folders`}>Create folder</a>
            <a href={`${model.baseUrl}/manage/folders`}>Rename folder</a>
            <a href={`${model.baseUrl}/manage/folders`}>Delete folder</a>
          </div> : null}
          <button
            className={`${s.allRecords} ${ws.selectedFolder === null ? s.selectedFolder : ""}`}
            onClick={() => ws.selectFolder(null)}
          >
            <Folders size={18} />
            <span>All records</span>
            <small>{model.totalReadableRecordCount}</small>
          </button>
          <div className={s.folderTree}>
            {model.folders.map((folder) => folderTree(folder))}
          </div>
          <div className={s.folderNote}>
            <span className={s.liveDot} />
            THE DOMAIN ARCHIVE
            <p>{model.totalReadableRecordCount} readable records</p>
          </div>
        </aside>
        <Modal
          open={foldersOpen}
          onOpenChange={setFoldersOpen}
          title="Collections"
          description="Browse the domain archive."
        >
          <div className={s.mobileFolderList}>
            <button
              className={`${s.allRecords} ${ws.selectedFolder === null ? s.selectedFolder : ""}`}
              onClick={() => {
                ws.selectFolder(null);
                setFoldersOpen(false);
              }}
            >
              <Folders size={18} />
              <span>All records</span>
              <small>{model.totalReadableRecordCount}</small>
            </button>
            {model.folders.map((folder) => folderTree(folder))}
            {model.capabilities.manageFolders && (
              <ActionMenu
                label="Folder management"
                trigger={
                  <>
                    <MoreHorizontal size={18} />
                    Manage folders
                  </>
                }
                items={ws.folderActions}
                onAction={(action) => {
                  setFoldersOpen(false);
                  ws.onAction(action);
                }}
              />
            )}
          </div>
        </Modal>
        <section className={s.recordsPanel} aria-label="Records">
          <div className={s.archiveToolbar}>
            <button
              className={s.mobileFolderButton}
              onClick={() => setFoldersOpen(!foldersOpen)}
              aria-expanded={foldersOpen}
            >
              <Folders size={19} />
              Folders
            </button>
            <label className={s.search}>
              <Search size={19} />
              <input
                type="search"
                value={ws.search}
                onChange={(e) => ws.setSearch(e.target.value)}
                placeholder="Search the archive…"
                aria-label="Search records"
              />
              {ws.search && (
                <button
                  aria-label="Clear search"
                  onClick={() => ws.setSearch("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
              <select aria-label="Document type" value={ws.type} onChange={(event) => ws.setType(event.target.value)}>
                <option value="all">All types</option>
                {model.documentTypes.map((type) => <option key={type.id} value={String(type.id)}>{type.name}</option>)}
              </select>
          </div>
          <div className={s.resultsHeading}>
            <div>
              <span>{selectedFolder?.name ?? "All records"}</span>
              <small aria-live="polite">{ws.resultCount} records</small>
            </div>
            <div className={s.resultControls}>
              <label className={s.checkbox}>
                <input
                  type="checkbox"
                  checked={ws.includeSubfolders}
                  onChange={(e) => ws.setIncludeSubfolders(e.target.checked)}
                />
                <Check size={12} />
                <span>Search subfolders</span>
              </label>
              <ChoiceMenu
                label="Sort records"
                value={ws.sort}
                onChange={(value) =>
                  ws.setSort(value as RecordsViewState["sort"])
                }
                choices={[
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                  { value: "title-asc", label: "Title A–Z" },
                  { value: "title-desc", label: "Title Z–A" },
                ]}
              />
              <ToggleGroup.Root
                className={s.viewToggle}
                type="single"
                value={ws.view}
                onValueChange={(value) => {
                  if (value === "cards" || value === "list") ws.setView(value);
                }}
                aria-label="Records view"
              >
                <ToggleGroup.Item value="cards" aria-label="Card view">
                  <LayoutGrid size={16} />
                </ToggleGroup.Item>
                <ToggleGroup.Item value="list" aria-label="List view">
                  <List size={17} />
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>
          </div>
          <div className={ws.view === "cards" ? s.recordGrid : s.recordList}>
            {ws.records.map((record) => {
              const type = model.documentTypes.find(
                (t) => t.id === record.documentTypeId,
              )?.name;
              const predecessor = model.supersessionEdges.find(
                (edge) => edge.newerId === record.id,
              );
              const successor = model.supersessionEdges.find(
                (edge) => edge.olderId === record.id,
              );
              const lifecycle = successor ? "Superseded" : record.lifecycle;
              const formattedDate = new Date(record.updatedAt).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                },
              );
              if (ws.view === "list") {
                return (
                  <article
                    key={record.id}
                    className={`${s.recordRow} ${successor ? s.supersededRow : ""}`}
                  >
                    <a
                      className={s.rowTitle}
                      href={`${model.baseUrl}/documents/${record.id}`}
                    >
                      {record.title}
                    </a>
                    <span className={s.rowAuthor}>
                      {record.preparedBy ?? "Unattributed"}
                      {record.locked && (
                        <LockKeyhole size={13} aria-label="Locked" />
                      )}
                    </span>
                    <time dateTime={record.updatedAt}>{formattedDate}</time>
                    <span
                      className={`${s.status} ${record.lifecycle === "draft" || record.lifecycle === "submitted" ? s.draft : ""}`}
                    >
                      {lifecycle}
                    </span>
                    <ActionMenu
                      label={`Actions for ${record.title}`}
                      trigger={<MoreHorizontal size={18} />}
                      items={ws.actions[record.id] ?? []}
                      onAction={(action) => ws.onAction(action, record)}
                    />
                    <RecordCapabilityLinks model={model} record={record} onDelete={() => ws.onAction({ key: "delete", label: "Delete record", danger: true }, record)} />
                  </article>
                );
              }
              return (
                <article
                  key={record.id}
                  className={`${s.recordCard} ${successor ? s.supersededCard : ""}`}
                >
                  <div className={s.recordCardTop}>
                    <span className={s.recordType}>{type}</span>
                    <span
                      className={`${s.status} ${record.lifecycle === "draft" || record.lifecycle === "submitted" ? s.draft : ""}`}
                    >
                      {lifecycle}
                    </span>
                  </div>
                  <h2>
                    <a href={`${model.baseUrl}/documents/${record.id}`}>
                      {record.title}
                    </a>
                  </h2>
                  <div className={s.recordByline}>
                    {record.preparedBy ?? "Unattributed"}
                    {record.locked && (
                      <LockKeyhole size={13} aria-label="Locked" />
                    )}
                  </div>
                  {(predecessor || successor) && (
                    <span className={s.supersessionHint}>
                      <CornerDownRight size={13} />
                      {successor
                        ? "A newer record is available"
                        : "Continues an earlier record"}
                    </span>
                  )}
                  <div className={s.recordCardBottom}>
                    <time dateTime={record.updatedAt}>{formattedDate}</time>
                    <ActionMenu
                      label={`Actions for ${record.title}`}
                      trigger={<MoreHorizontal size={18} />}
                      items={ws.actions[record.id] ?? []}
                      onAction={(action) => ws.onAction(action, record)}
                    />
                    <RecordCapabilityLinks model={model} record={record} onDelete={() => ws.onAction({ key: "delete", label: "Delete record", danger: true }, record)} />
                    <a
                      href={`${model.baseUrl}/documents/${record.id}`}
                      aria-label={`Read ${record.title}`}
                    >
                      <ArrowUpRight size={19} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
          {ws.records.length === 0 && (
            <div className={s.empty}>
              <Search size={28} />
              <h2>No records found.</h2>
              <p>Try another title or choose a different collection.</p>
              <button
                className={s.secondaryButton}
                onClick={() => {
                  ws.setSearch("");
                  ws.setType("all");
                  ws.selectFolder(null);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className={s.pagination}>
            <span>
              Showing {ws.resultCount === 0 ? 0 : (ws.page - 1) * ws.pageSize + 1}–
              {Math.min(ws.page * ws.pageSize, ws.resultCount)} of {ws.resultCount}
            </span>
            <div className={s.paginationControls}>
              <span>{ws.view === "cards" ? "Cards" : "Rows"} per page</span>
              <ChoiceMenu
                label={`${ws.view === "cards" ? "Cards" : "Rows"} per page`}
                value={String(ws.pageSize)}
                onChange={(value) => ws.setPageSize(Number(value))}
                choices={(ws.view === "cards" ? [6, 12, 24] : [25, 50, 100]).map(
                  (value) => ({ value: String(value), label: String(value) }),
                )}
              />
              <button
                className={s.pageButton}
                onClick={() => ws.setPage(ws.page - 1)}
                disabled={ws.page <= 1}
                aria-label="Previous page"
              >
                <ArrowLeft size={15} />
              </button>
              <span className={s.pageCount}>
                {ws.page} / {ws.pageCount}
              </span>
              <button
                className={s.pageButton}
                onClick={() => ws.setPage(ws.page + 1)}
                disabled={ws.page >= ws.pageCount}
                aria-label="Next page"
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function recordActions(model: RecordsPageModel, record: RecordSummary, deleteAction: ((formData: FormData) => void | Promise<void>) | null): Action[] {
  const actions: Action[] = [{ key: "view", label: "View record", href: `${model.baseUrl}/documents/${record.id}` }];
  if (record.capabilities.edit) actions.push({ key: "edit", label: "Edit record", href: `${model.baseUrl}/documents/${record.id}/edit` });
  if (record.capabilities.supersede) actions.push({ key: "supersede", label: "Supersede", href: `${model.baseUrl}/records/new?supersedes=${record.id}` });
  if (record.capabilities.delete && deleteAction) actions.push({ key: "delete", label: "Delete record", danger: true });
  return actions;
}

function RecordCapabilityLinks({ model, record, onDelete }: { model: RecordsPageModel; record: RecordSummary; onDelete: () => void }) {
  return <span className={s.quietLink}>
    {record.capabilities.edit ? <a href={`${model.baseUrl}/documents/${record.id}/edit`}>Edit</a> : null}
    {record.capabilities.supersede ? <a href={`${model.baseUrl}/records/new?supersedes=${record.id}`}>Supersede</a> : null}
    {record.capabilities.delete ? <button type="button" onClick={onDelete}>Delete</button> : null}
  </span>
}

function boundedPageSize(value: number): 6 | 12 | 24 | 25 | 50 | 100 {
  return ([6, 12, 24, 25, 50, 100] as const).includes(value as 6 | 12 | 24 | 25 | 50 | 100) ? value as 6 | 12 | 24 | 25 | 50 | 100 : 50;
}

function serverSort(value: RecordsViewState["sort"]): '-updatedAt' | 'updatedAt' | 'title' | '-title' {
  return value === "oldest" ? "updatedAt" : value === "title-asc" ? "title" : value === "title-desc" ? "-title" : "-updatedAt";
}
