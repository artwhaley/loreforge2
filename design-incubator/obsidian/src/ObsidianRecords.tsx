"use client";
import { useState } from "react";
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
import type { RecordsPageModel } from "./contracts/records";
import type { FolderSummary, RecordSummary } from "./contracts/common";
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
export function ObsidianRecords({
  model,
  workspace: ws,
}: {
  model: RecordsPageModel;
  workspace: RecordsViewState;
}) {
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
              <button
                className={s.secondaryButton}
                onClick={() =>
                  ws.onAction({ key: "import", label: "Import notecard" })
                }
              >
                <Upload size={16} />
                Import
              </button>
              <button
                className={s.primaryButton}
                onClick={() =>
                  ws.onAction({ key: "new", label: "New document" })
                }
              >
                <Plus size={17} />
                New document
              </button>
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
            <ChoiceMenu
              label="Document type"
              value={ws.type}
              onChange={ws.setType}
              choices={[
                { value: "all", label: "All types" },
                ...model.documentTypes.map((type) => ({
                  value: String(type.id),
                  label: type.name,
                })),
              ]}
            />
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
                <span>Include subfolders</span>
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
