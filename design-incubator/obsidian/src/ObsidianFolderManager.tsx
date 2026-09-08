"use client";
import { useMemo, useRef, useState } from "react";
import { Tree, type NodeRendererProps, type TreeApi } from "react-arborist";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { ActionMenu, ChoiceMenu } from "./controls";
import s from "./obsidian.module.css";

export type ManagedFolderNode = {
  id: string;
  name: string;
  createdLabel: string;
  systemManaged?: boolean;
  children: ManagedFolderNode[];
};

type Sort = "name-asc" | "name-desc" | "newest" | "oldest";

function sortTree(nodes: ManagedFolderNode[], sort: Sort): ManagedFolderNode[] {
  const direction = sort === "name-desc" || sort === "oldest" ? -1 : 1;
  const comparator = (left: ManagedFolderNode, right: ManagedFolderNode) => {
    if (sort === "newest" || sort === "oldest")
      return left.createdLabel.localeCompare(right.createdLabel) * direction;
    return left.name.localeCompare(right.name) * direction;
  };
  return [...nodes]
    .sort(comparator)
    .map((node) => ({ ...node, children: sortTree(node.children, sort) }));
}

function FolderRow({
  node,
  style,
  dragHandle,
}: NodeRendererProps<ManagedFolderNode>) {
  const hasChildren = node.data.children.length > 0;
  return (
    <div
      className={`${s.arboristRow} ${node.isOpen ? s.treeOpen : ""} ${node.isSelected ? s.arboristSelected : ""}`}
      style={style}
      ref={dragHandle}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={() => !node.data.systemManaged && node.edit()}
    >
      <button
        className={s.treeChevron}
        onClick={(event) => {
          event.stopPropagation();
          if (hasChildren) node.toggle();
        }}
        aria-label={hasChildren ? `${node.isOpen ? "Collapse" : "Expand"} ${node.data.name}` : undefined}
        aria-hidden={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren && <ChevronRight size={15} />}
      </button>
      {node.isOpen && hasChildren ? (
        <FolderOpen size={17} className={s.treeFolderIcon} />
      ) : (
        <Folder size={17} className={s.treeFolderIcon} />
      )}
      {node.isEditing ? (
        <input
          className={s.treeRename}
          defaultValue={node.data.name}
          aria-label={`Rename ${node.data.name}`}
          autoFocus
          onBlur={(event) => node.submit(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") node.submit(event.currentTarget.value);
            if (event.key === "Escape") node.reset();
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <span className={s.treeName}>{node.data.name}</span>
      )}
      {node.data.systemManaged && <span className={s.systemTag}>System</span>}
      <span className={s.treeDate}>{node.data.createdLabel}</span>
    </div>
  );
}

export function ObsidianFolderManager({
  folders,
  onAction,
}: {
  folders: ManagedFolderNode[];
  onAction: (label: string) => void;
}) {
  const tree = useRef<TreeApi<ManagedFolderNode> | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name-asc");
  const [selected, setSelected] = useState<ManagedFolderNode | null>(null);
  const sorted = useMemo(() => sortTree(folders, sort), [folders, sort]);
  return (
    <div className={s.workspacePage}>
      <header className={s.pageHeading}>
        <div>
          <p className={s.eyebrow}>RECORDS ORGANIZATION</p>
          <h1>Folders</h1>
          <p>Arrange the archive without changing the permissions carried by document types.</p>
        </div>
        <button className={s.primaryButton} onClick={() => onAction("New folder")}>
          <Plus size={17} /> New folder
        </button>
      </header>
      <section className={s.treeManager} aria-label="Folder manager">
        <div className={s.treeToolbar}>
          <label className={s.search}>
            <Search size={18} />
            <span className={s.srOnly}>Search folders</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folders" />
          </label>
          <ChoiceMenu
            label="Sort folders"
            value={sort}
            onChange={(value) => setSort(value as Sort)}
            choices={[
              { value: "name-asc", label: "Name A–Z" },
              { value: "name-desc", label: "Name Z–A" },
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
        </div>
        <div className={s.treeCanvas}>
          <Tree<ManagedFolderNode>
            ref={tree}
            data={sorted}
            idAccessor={(node) => node.id}
            childrenAccessor={(node) => node.children}
            openByDefault
            width="100%"
            height={470}
            indent={24}
            rowHeight={42}
            overscanCount={5}
            searchTerm={query}
            searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
            disableDrag={(node) => Boolean(node.systemManaged)}
            disableDrop={({ parentNode }) => !parentNode || Boolean(parentNode.data.systemManaged)}
            onSelect={(nodes) => setSelected(nodes[0]?.data ?? null)}
            onMove={() => onAction("Move folder preview")}
            onRename={({ id, name }) => onAction(`Rename folder: ${id} → ${name}`)}
          >
            {FolderRow}
          </Tree>
        </div>
        <div className={s.treeFooter}>
          <span>
            {selected ? `Selected: ${selected.name}` : "Select a folder to inspect or manage it."}
          </span>
          <ActionMenu
            label="Folder actions"
            trigger={<><MoreHorizontal size={18} /> Folder actions</>}
            onAction={(action) => {
              if (action.key === "rename" && selected) tree.current?.get(selected.id)?.edit();
              else onAction(selected ? `${action.label}: ${selected.name}` : action.label);
            }}
            items={[
              { key: "new-child", label: "New subfolder" },
              { key: "rename", label: "Rename" },
              { key: "move", label: "Move folder" },
              { key: "delete", label: "Delete folder", danger: true },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
