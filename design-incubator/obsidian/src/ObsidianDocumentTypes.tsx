"use client";
import { useMemo, useRef, useState } from "react";
import { Tree, type NodeRendererProps, type TreeApi } from "react-arborist";
import {
  ChevronRight,
  Copy,
  FileText,
  Folder,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ActionMenu } from "./controls";
import s from "./obsidian.module.css";

export type DocumentTypeTreeNode = {
  id: string;
  kind: "department" | "folder" | "unassigned" | "type";
  name: string;
  children: DocumentTypeTreeNode[];
  template?: "Blank" | "Markdown" | "Form";
  templateName?: string;
  description?: string;
};

function countTypes(nodes: DocumentTypeTreeNode[]): number {
  return nodes.reduce(
    (count, node) => count + (node.kind === "type" ? 1 : 0) + countTypes(node.children),
    0,
  );
}

function TypeTreeRow({ node, style, dragHandle }: NodeRendererProps<DocumentTypeTreeNode>) {
  const item = node.data;
  const hasChildren = item.children.length > 0;
  const isType = item.kind === "type";
  return (
    <div
      className={`${s.arboristRow} ${s.typeTreeRow} ${node.isOpen ? s.treeOpen : ""} ${node.isSelected ? s.arboristSelected : ""}`}
      style={style}
      ref={dragHandle}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={() => !isType && item.kind !== "unassigned" && node.toggle()}
    >
      <button
        className={s.treeChevron}
        onClick={(event) => {
          event.stopPropagation();
          if (hasChildren) node.toggle();
        }}
        aria-label={hasChildren ? `${node.isOpen ? "Collapse" : "Expand"} ${item.name}` : undefined}
        aria-hidden={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren && <ChevronRight size={15} />}
      </button>
      {isType ? <FileText size={16} className={s.typeIcon} /> : <Folder size={16} className={s.treeFolderIcon} />}
      <span className={s.treeName}>{item.name}</span>
      {item.kind === "department" && <span className={s.rootTag}>Department root</span>}
      {item.kind === "unassigned" && <span className={s.rootTag}>Orphaned types</span>}
      {isType && (
        <>
          <span className={s.templateChip}>{item.template}</span>
          <span className={s.templateName}>{item.templateName ?? "No template yet"}</span>
        </>
      )}
    </div>
  );
}

export function ObsidianDocumentTypes({
  nodes,
  onAction,
}: {
  nodes: DocumentTypeTreeNode[];
  onAction: (label: string) => void;
}) {
  const tree = useRef<TreeApi<DocumentTypeTreeNode> | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DocumentTypeTreeNode | null>(null);
  const visibleTypes = useMemo(() => countTypes(nodes), [nodes]);
  return (
    <div className={s.workspacePage}>
      <header className={s.pageHeading}>
        <div>
          <p className={s.eyebrow}>FIRST-ORDER AUTHORING</p>
          <h1>Document types</h1>
          <p>Types define a record’s templates, lifecycle, and destination routing.</p>
        </div>
        <button className={s.primaryButton} onClick={() => onAction("New document type")}>
          <Plus size={17} /> New document type
        </button>
      </header>
      <nav className={s.typeSubnav} aria-label="Document type navigation">
        <a aria-current="page" href="#types">Document types</a>
        <a href="#templates">Templates</a>
        <a href="#forms">Forms</a>
      </nav>
      <section className={s.typeBrowser} id="types">
        <div className={s.typeTreePane}>
          <div className={s.treeToolbar}>
            <label className={s.search}>
              <Search size={18} />
              <span className={s.srOnly}>Search document types</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search types and folders" />
            </label>
          </div>
          <div className={s.treeCanvas}>
            <Tree<DocumentTypeTreeNode>
              ref={tree}
              data={nodes}
              idAccessor={(node) => node.id}
              childrenAccessor={(node) => node.children}
              openByDefault
              width="100%"
              height={446}
              indent={24}
              rowHeight={42}
              searchTerm={query}
              searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
              disableDrag={(node) => node.kind === "department" || node.kind === "unassigned"}
              disableDrop={({ parentNode }) => !parentNode || parentNode.data.kind === "unassigned" || parentNode.data.kind === "type"}
              onSelect={(selectedNodes) => setSelected(selectedNodes.find((node) => node.data.kind === "type")?.data ?? null)}
              onMove={() => onAction("Move type or type folder preview")}
              onRename={({ id, name }) => onAction(`Rename type folder: ${id} → ${name}`)}
            >
              {TypeTreeRow}
            </Tree>
          </div>
          <div className={s.typeTreeFoot}>{visibleTypes} visible document types</div>
        </div>
        <aside className={s.typeInspector} aria-label="Document type inspector">
          {selected ? (
            <>
              <div className={s.inspectorHead}>
                <span className={s.templateChip}>{selected.template}</span>
                <ActionMenu
                  label={`Actions for ${selected.name}`}
                  trigger={<MoreHorizontal size={19} />}
                  onAction={(action) => onAction(`${action.label}: ${selected.name}`)}
                  items={[
                    { key: "duplicate", label: "Duplicate" },
                    { key: "deactivate", label: "Deactivate" },
                    { key: "delete", label: "Delete", danger: true },
                  ]}
                />
              </div>
              <h2>{selected.name}</h2>
              <p>{selected.description ?? "A document type ready for configuration."}</p>
              <dl className={s.inspectorFacts}>
                <div><dt>Creation method</dt><dd>{selected.template} {selected.template === "Blank" ? "document" : "template"}</dd></div>
                <div><dt>Attached template</dt><dd>{selected.templateName ?? "No template yet"}</dd></div>
                <div><dt>Lifecycle</dt><dd>Draft → Submitted → Filed</dd></div>
              </dl>
              <button className={s.secondaryButton} onClick={() => onAction(`Edit ${selected.name}`)}>
                <ShieldCheck size={15} /> Configure type
              </button>
              <button className={s.quietButton} onClick={() => onAction(`Duplicate ${selected.name}`)}>
                <Copy size={14} /> Duplicate with independent template
              </button>
            </>
          ) : (
            <div className={s.inspectorEmpty}>
              <FileText size={25} />
              <h2>Choose a document type</h2>
              <p>Select a line in the tree to inspect its template and lifecycle configuration.</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
