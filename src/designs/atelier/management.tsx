"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFolderManagementWorkspace } from "@/components/functional/folders/useFolderManagementWorkspace";
import { useRoleManagementWorkspace } from "@/components/functional/roles/useRoleManagementWorkspace";
import { useDocumentTypesManagementWorkspace } from "@/components/functional/document-types/useDocumentTypesManagementWorkspace";
import {
  usePeopleManagementWorkspace,
  peopleSearchOptionId,
} from "@/components/functional/people/usePeopleManagementWorkspace";
import {
  FolderTree,
  RoleTree,
  type FolderTreeNode,
} from "@/components/people/PersonAccessTrees";
import { TypePermissionGrid } from "@/components/roles/TypePermissionGrid";
import { TypeInspector } from "@/components/documentTypes/TypeInspector";
import {
  duplicateTypeAction,
  setActiveTypeAction,
  issueInvitationAction,
  type IssueInvitationState,
} from "@/lib/design/hostActionBridges";
import { flattenFolderNodes } from "@/lib/archive/folderManagement";
import type { DepartmentsManagementPageModel } from "@/lib/page-models/management/departments";
import type { FolderManagementPageModel } from "@/lib/page-models/management/folders";
import type { RoleManagementPageModel } from "@/lib/page-models/management/roles";
import type { DocumentTypesManagementPageModel } from "@/lib/page-models/management/documentTypes";
import type {
  PeopleManagementPageModel,
  PersonManagementPageModel,
} from "@/lib/page-models/management/people";
import type { InvitationsManagementPageModel } from "@/lib/page-models/management/invitations";
import type { WorkDesignViewProps } from "@/lib/design/types";
import { Heading, Empty, Status } from "./primitives";
import s from "./management.module.css";

function Fields({ values }: { values: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}
function Post({
  action,
  values,
  children,
  confirm,
}: {
  action: string;
  values: Record<string, string | number>;
  children: ReactNode;
  confirm?: string;
}) {
  return (
    <form
      action={action}
      method="post"
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <Fields values={values} />
      {children}
    </form>
  );
}
function useOperation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The change could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return { busy, run, feedback: error ? <p role="alert">{error}</p> : null };
}

export function AtelierManageDepartments(p: DepartmentsManagementPageModel) {
  return (
    <section className={s.page}>
      <Heading title={p.vocabulary.subdomainPlural}>
        The working groups behind your domain.
      </Heading>
      <Status status={p.status} />
      <div className={s.split}>
        <aside>
          {p.canCreate ? (
            <section className={s.panel}>
              <h2>Create {p.vocabulary.subdomainSingular.toLowerCase()}</h2>
              <Post
                action="/api/departments"
                values={{ domainSlug: p.domainSlug }}
              >
                <div className={s.form}>
                  <label>
                    Name
                    <input name="name" required maxLength={120} />
                  </label>
                  <button>Create department</button>
                </div>
              </Post>
            </section>
          ) : (
            <Empty>You can browse the departments available to you.</Empty>
          )}
        </aside>
        <section className={s.panel}>
          <h2>Departments</h2>
          {!p.departments.length && <Empty>No departments yet.</Empty>}
          {p.departments.map((d) => (
            <article className={s.item} key={d.id}>
              <h3>
                <a href={`${p.baseUrl}/departments/${d.slug}`}>{d.name}</a>
              </h3>
              <p>{d.archived ? "Archived" : "Active"}</p>
              <div className={s.actions}>
                {d.canArchive && (
                  <Post
                    action="/api/departments"
                    values={{
                      domainSlug: p.domainSlug,
                      departmentId: d.id,
                      action: "archive",
                    }}
                    confirm={`Archive ${d.name}? Its document types will move to Unassigned until restored.`}
                  >
                    <button>Archive</button>
                  </Post>
                )}
                {d.canRestore && (
                  <Post
                    action="/api/departments"
                    values={{
                      domainSlug: p.domainSlug,
                      departmentId: d.id,
                      action: "restore",
                    }}
                  >
                    <button>Restore</button>
                  </Post>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}

export function AtelierFolders(p: FolderManagementPageModel) {
  const w = useFolderManagementWorkspace(p),
    op = useOperation();
  const selected = w.all.find(({ node }) => node.id === w.selectedIds[0])?.node;
  const rows = flattenFolderNodes(w.sortedFolders).filter(({ node }) =>
    node.name.toLocaleLowerCase().includes(w.query.trim().toLocaleLowerCase()),
  );
  return (
    <section className={s.page}>
      <Heading title="Folders">Give the archive a useful shape.</Heading>
      <Status status={p.status} />
      {op.feedback}
      <div className={s.split}>
        <aside className={s.panel}>
          <div className={s.form}>
            <label>
              Search folders
              <input
                type="search"
                value={w.query}
                onChange={(e) => w.setQuery(e.target.value)}
              />
            </label>
            <label>
              Sort folders
              <select
                value={w.sort}
                onChange={(e) => w.setSort(e.target.value as typeof w.sort)}
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
              </select>
            </label>
            <div className={s.index}>
              {rows.map(({ node, depth }) => (
                <button
                  key={node.id}
                  style={{ paddingInlineStart: 12 + depth * 14 }}
                  aria-pressed={selected?.id === node.id}
                  onClick={() => w.setSelectedIds([node.id])}
                >
                  {node.name}
                </button>
              ))}
            </div>
            {!rows.length && <Empty>No folders match.</Empty>}
          </div>
        </aside>
        <div>
          {(w.canManageRoot || w.all.some(({ node }) => node.canManage)) && (
            <section className={s.panel}>
              <h2>Create folder</h2>
              <form
                className={s.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    data = new FormData(form);
                  void op.run(async () => {
                    await w.createFolder(
                      String(data.get("name")),
                      Number(data.get("parentId")) || null,
                    );
                    form.reset();
                  });
                }}
              >
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Inside
                  <select name="parentId">
                    {w.canManageRoot && <option value="">Domain root</option>}
                    {w.all
                      .filter(({ node }) => node.canManage)
                      .map(({ node, depth }) => (
                        <option key={node.id} value={node.id}>
                          {"— ".repeat(depth)}
                          {node.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button disabled={op.busy || w.busy}>Create folder</button>
              </form>
            </section>
          )}
          {selected ? (
            <section className={s.panel} key={selected.id}>
              <h2>{selected.name}</h2>
              <p>
                {selected.systemManaged
                  ? "System-managed folder"
                  : "Archive folder"}
              </p>
              {selected.canManage && !selected.systemManaged ? (
                <>
                  <form
                    className={s.form}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      void op.run(() =>
                        w.renameFolder(selected.id, String(data.get("name"))),
                      );
                    }}
                  >
                    <label>
                      Folder name
                      <input
                        name="name"
                        required
                        defaultValue={selected.name}
                      />
                    </label>
                    <button disabled={op.busy || w.busy}>Rename folder</button>
                  </form>
                  <details>
                    <summary>Move folder</summary>
                    <form
                      className={s.form}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        void op.run(() =>
                          w.moveFolder(
                            selected.id,
                            Number(data.get("parentId")) || null,
                          ),
                        );
                      }}
                    >
                      <label>
                        Destination
                        <select name="parentId" required defaultValue="">
                          <option value="" disabled>
                            Choose destination
                          </option>
                          {w.canManageRoot && (
                            <option value="0">Domain root</option>
                          )}
                          {w.moveTargets(selected).map(({ node, depth }) => (
                            <option key={node.id} value={node.id}>
                              {"— ".repeat(depth)}
                              {node.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button disabled={op.busy || w.busy}>Move folder</button>
                    </form>
                  </details>
                  <details>
                    <summary>Delete folder</summary>
                    <p>
                      Only folders that the host allows to be deleted can be
                      removed. Records are never silently discarded.
                    </p>
                    <button
                      disabled={op.busy || w.busy}
                      onClick={() => {
                        if (window.confirm(`Delete ${selected.name}?`))
                          void op.run(async () => {
                            await w.deleteFolder(selected.id);
                            w.setSelectedIds([]);
                          });
                      }}
                    >
                      Delete folder
                    </button>
                  </details>
                </>
              ) : (
                <p>
                  This folder cannot be renamed, moved, or deleted with your
                  current authority.
                </p>
              )}
            </section>
          ) : (
            <Empty>Select a folder to inspect it.</Empty>
          )}
        </div>
      </div>
    </section>
  );
}

export function AtelierRoles(p: RoleManagementPageModel) {
  const w = useRoleManagementWorkspace(p),
    op = useOperation(),
    role = w.selectedRecord;
  const canManage =
    !!role && p.manageableDepartmentIds.includes(role.departmentId);
  const folderStates = p.folderStatesByRole[String(role?.id)] ?? {};
  const mapFolders = (nodes: FolderTreeNode[]): FolderTreeNode[] =>
    nodes.map((n) => ({
      ...n,
      ...folderStates[String(n.id)],
      canManageAccess: canManage && n.canManageAccess !== false,
      children: mapFolders(n.children),
    }));
  return (
    <section className={s.page}>
      <Heading title="Roles">Responsibilities, people, and access.</Heading>
      <Status status={p.status} />
      {op.feedback}
      <div className={s.split}>
        <aside className={s.panel}>
          <nav className={s.index} aria-label="Roles">
            {p.departments.map((d) => (
              <section key={d.id}>
                <h3>{d.name}</h3>
                {p.roleRecords
                  .filter((r) => r.departmentId === d.id)
                  .map((r) => (
                    <button
                      key={r.id}
                      aria-pressed={w.selectedRoleId === r.id}
                      onClick={() => {
                        w.setSelectedRoleId(r.id);
                        w.closeDialog();
                      }}
                    >
                      {r.name}
                      {r.parentRoleId
                        ? ` · under ${p.roleRecords.find((parent) => parent.id === r.parentRoleId)?.name ?? "parent role"}`
                        : ""}
                    </button>
                  ))}
              </section>
            ))}
          </nav>
          {p.manageableDepartmentIds.length > 0 && (
            <details>
              <summary>Create role</summary>
              <form
                className={s.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    d = new FormData(form);
                  void op.run(async () => {
                    await w.createRole(
                      String(d.get("name")),
                      null,
                      Number(d.get("departmentId")),
                    );
                    form.reset();
                  });
                }}
              >
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  Department
                  <select name="departmentId">
                    {p.departments
                      .filter((d) => p.manageableDepartmentIds.includes(d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button disabled={op.busy}>Create role</button>
              </form>
            </details>
          )}
        </aside>
        <div>
          {role ? (
            <>
              <section className={s.panel}>
                <h2>{role.name}</h2>
                <p>{w.selectedDepartment?.name}</p>
                <h3>Current holders</h3>
                {(p.holdersByRole[String(role.id)] ?? []).map((h) => (
                  <div className={s.item} key={h.id}>
                    <a href={`${p.baseUrl}/manage/people/${h.id}`}>{h.name}</a>
                    {p.assignableRoleIds.includes(role.id) && (
                      <Post
                        action="/api/role-assignments"
                        values={{
                          domainSlug: p.domainSlug,
                          roleId: role.id,
                          characterId: h.id,
                          action: "remove",
                        }}
                      >
                        <button>Remove role from {h.name}</button>
                      </Post>
                    )}
                  </div>
                ))}
                {!p.holdersByRole[String(role.id)]?.length && (
                  <Empty>No holders yet.</Empty>
                )}
                {p.assignableRoleIds.includes(role.id) && (
                  <>
                    <button onClick={() => w.openDialog("assign")}>
                      Assign people
                    </button>
                    {w.dialog === "assign" && (
                      <div className={s.form}>
                        <label>
                          Search people
                          <input
                            value={w.query}
                            onChange={(e) => w.setQuery(e.target.value)}
                          />
                        </label>
                        {w.results.map((person) => (
                          <label key={person.id}>
                            <span>
                              <input
                                type="checkbox"
                                checked={w.selectedPeople.some(
                                  (x) => x.id === person.id,
                                )}
                                onChange={() => w.togglePerson(person)}
                              />{" "}
                              {person.localName || person.name}
                            </span>
                          </label>
                        ))}
                        <p>{w.selectedPeople.length} selected</p>
                        <div className={s.actions}>
                          <button
                            disabled={op.busy || !w.selectedPeople.length}
                            onClick={() =>
                              void op.run(async () => {
                                await w.assignRole(
                                  role.id,
                                  w.selectedPeople.map((x) => x.id),
                                );
                                w.closeDialog();
                              })
                            }
                          >
                            Assign selected people
                          </button>
                          <button onClick={w.closeDialog}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {canManage && (
                  <details>
                    <summary>Role structure</summary>
                    <form
                      className={s.form}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget,
                          d = new FormData(form);
                        void op.run(async () => {
                          await w.createRole(
                            String(d.get("name")),
                            role.id,
                            role.departmentId,
                          );
                          form.reset();
                        });
                      }}
                    >
                      <label>
                        Child role name
                        <input name="name" required />
                      </label>
                      <button disabled={op.busy}>Create child role</button>
                    </form>
                    <div className={s.actions}>
                      <button
                        disabled={op.busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete ${role.name} and its assignments?`,
                            )
                          )
                            void op.run(async () => {
                              await w.deleteRole(role.id);
                              w.setSelectedRoleId(null);
                            });
                        }}
                      >
                        Delete role
                      </button>
                    </div>
                  </details>
                )}
              </section>
              <section className={`${s.panel} ${s.scroll}`}>
                <TypePermissionGrid
                  key={role.id}
                  domainSlug={p.domainSlug}
                  principalType="Role"
                  principalId={role.id}
                  types={p.types}
                  statesByType={p.typeStatesByRole[String(role.id)] ?? {}}
                  canManage={canManage}
                />
                <details>
                  <summary>Folder restrictions</summary>
                  <FolderTree
                    key={role.id}
                    domainSlug={p.domainSlug}
                    principalType="Role"
                    principalId={role.id}
                    folders={mapFolders(p.folderNodes)}
                  />
                </details>
              </section>
            </>
          ) : (
            <Empty>Select a role to inspect it.</Empty>
          )}
        </div>
      </div>
    </section>
  );
}

export function AtelierDocumentTypes(p: DocumentTypesManagementPageModel) {
  const w = useDocumentTypesManagementWorkspace(p),
    op = useOperation(),
    router = useRouter(),
    [editing, setEditing] = useState(false),
    type = w.selectedLeaf;
  return (
    <section className={s.page}>
      <Heading
        title="Document types"
        actions={
          p.canManage ? (
            <button
              onClick={() => {
                w.beginCreate();
                setEditing(true);
              }}
            >
              New document type
            </button>
          ) : undefined
        }
      >
        Define the records your domain keeps.
      </Heading>
      <Status status={p.status} />
      {op.feedback}
      <nav className={s.actions} aria-label="Document resources">
        <a href={`${p.baseUrl}/templates`}>Markdown templates</a>
        <a href={`${p.baseUrl}/forms`}>Form templates</a>
      </nav>
      <div className={s.split}>
        <aside className={`${s.panel} ${s.index}`}>
          {p.tree.types.map((t) => (
            <button
              key={t.id}
              aria-pressed={type?.id === t.id}
              onClick={() => {
                w.selectType(t.id);
                setEditing(false);
              }}
            >
              {t.name}
              {!t.active ? " (inactive)" : ""}
            </button>
          ))}
          {!p.tree.types.length && <Empty>No document types yet.</Empty>}
        </aside>
        <section className={`${s.panel} ${s.scroll}`}>
          {p.canManage && editing && (w.creating || type) ? (
            <>
              <button
                onClick={() => {
                  w.cancelCreate();
                  setEditing(false);
                }}
              >
                Close editor
              </button>
              <TypeInspector
                key={w.creating ? "create" : type?.id}
                mode={w.creating ? "create" : "edit"}
                domainSlug={p.domainSlug}
                leaf={type}
                departments={p.tree.departments}
                typeFolders={w.typeFolders}
                roles={p.inspector.roles}
                folders={p.inspector.folders}
                stages={
                  w.creating || !type
                    ? null
                    : (p.inspector.stagesByType[type.id] ?? null)
                }
                defaultDepartmentId={type?.departmentId ?? null}
                onCreated={w.finishCreate}
                onDuplicate={w.selectType}
                onCancel={() => {
                  w.cancelCreate();
                  setEditing(false);
                }}
              />
            </>
          ) : type ? (
            <>
              <h2>{type.name}</h2>
              <p>{type.description || "No description provided."}</p>
              <p>
                {type.active ? "Active" : "Inactive"} ·{" "}
                {type.templateName ?? type.templateSelection}
              </p>
              {p.canManage && (
                <div className={s.actions}>
                  <button onClick={() => setEditing(true)}>
                    Configure type
                  </button>
                  <button
                    disabled={op.busy}
                    onClick={() =>
                      void op.run(async () => {
                        const result = await duplicateTypeAction({
                          domainSlug: p.domainSlug,
                          typeId: type.id,
                        });
                        if (!result.ok)
                          throw new Error("Could not duplicate this type.");
                        router.refresh();
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    disabled={op.busy}
                    onClick={() =>
                      void op.run(async () => {
                        const result = await setActiveTypeAction({
                          domainSlug: p.domainSlug,
                          typeId: type.id,
                          active: !type.active,
                        });
                        if (!result.ok)
                          throw new Error("Could not change this type.");
                        router.refresh();
                      })
                    }
                  >
                    {type.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <Empty>
              Select a document type to view its template, permissions, and
              lifecycle.
            </Empty>
          )}
        </section>
      </div>
    </section>
  );
}

export function AtelierPeople(p: PeopleManagementPageModel) {
  return (
    <section className={s.page}>
      <Heading title="People">
        Identity, membership, and individual access.
      </Heading>
      <Status status={p.status} />
      {p.canOpenPeople ? (
        <PeopleSearch domainSlug={p.domainSlug} />
      ) : (
        <Empty>You do not have access to this workspace.</Empty>
      )}
    </section>
  );
}
function PeopleSearch({ domainSlug }: { domainSlug: string }) {
  const {
    inputRef,
    listOpen,
    activeIndex,
    results,
    query,
    handleQueryChange,
    handleKeyDown,
    loading,
    setActiveIndex,
    selectResult,
  } = usePeopleManagementWorkspace(domainSlug);
  return (
    <section className={s.panel}>
      <label className={s.form}>
        Search people
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls="atelier-people-results"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex !== null && results[activeIndex]
              ? peopleSearchOptionId(results[activeIndex].id)
              : undefined
          }
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Name or local alias"
        />
      </label>
      {loading && <p role="status">Searching…</p>}
      <ul
        id="atelier-people-results"
        role="listbox"
        aria-label="People"
        className={s.list}
      >
        {results.map((person, index) => (
          <li
            id={peopleSearchOptionId(person.id)}
            key={person.id}
            role="option"
            aria-selected={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => selectResult(person.id)}
          >
            <strong>{person.localName || person.name}</strong>
            <p>{person.controllerName || "Unclaimed character"}</p>
            <span>{person.roles.join(", ") || "No roles"}</span>
          </li>
        ))}
      </ul>
      {listOpen && !loading && !results.length ? (
        <Empty>No people match your search.</Empty>
      ) : (
        !query && (
          <p>
            Search for a character, then use the arrow keys and Enter to open
            their workspace.
          </p>
        )
      )}
    </section>
  );
}
export function AtelierPerson(p: PersonManagementPageModel) {
  return (
    <section className={s.page}>
      <Heading title={p.localDisplayName || p.character.name}>
        {p.controller?.name || p.controller?.email || "Unclaimed character"}
      </Heading>
      <Status status={p.status} />
      <a href={`${p.baseUrl}/manage/people`}>Back to people</a>
      <section className={s.panel}>
        <h2>Department roles</h2>
        <RoleTree
          domainSlug={p.domainSlug}
          characterId={p.character.id}
          departments={p.roleDepartments}
          initialMode={p.roleFilter}
        />
      </section>
      <section className={`${s.panel} ${s.scroll}`}>
        <h2>Effective document access</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Read</th>
              <th>Create</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {p.typeAccess.map((t) => (
              <tr key={t.id}>
                <th scope="row">{t.name}</th>
                {(["read", "create", "edit"] as const).map((k) => (
                  <td key={k}>
                    {t[k].allowed ? "Allowed" : "Not allowed"}
                    <br />
                    <small>{t[k].source}</small>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!p.typeAccess.length && <Empty>No active document types.</Empty>}
      </section>
      <section className={s.panel}>
        <FolderTree
          domainSlug={p.domainSlug}
          characterId={p.character.id}
          folders={p.folderNodes}
        />
      </section>
      {p.canManageMembers && (
        <details>
          <summary>Domain membership</summary>
          <p>
            Removing membership also removes role assignments and direct folder
            access. Rejoining starts clean.
          </p>
          <Post
            action="/api/domain-memberships"
            values={{
              domainSlug: p.domainSlug,
              characterId: p.character.id,
              action: "remove",
            }}
            confirm={`Remove ${p.character.name} from this domain?`}
          >
            <button>Remove from domain</button>
          </Post>
        </details>
      )}
    </section>
  );
}

export function AtelierInvitations(p: InvitationsManagementPageModel) {
  const [purpose, setPurpose] = useState("domain_join"),
    [state, issue, pending] = useActionState<IssueInvitationState, FormData>(
      issueInvitationAction,
      { ok: false },
    );
  if (!p.canManage)
    return (
      <section className={s.page}>
        <Heading title="Invitations" />
        <Status status={p.status} />
        <Empty>You do not have access to invitations.</Empty>
      </section>
    );
  return (
    <section className={s.page}>
      <Heading title="Invitations">
        Welcome people and review their requests.
      </Heading>
      <Status status={p.status} />
      <div className={s.split}>
        <aside className={s.panel}>
          <h2>Create invitation</h2>
          <form action={issue} className={s.form}>
            <Fields
              values={{
                domainId: p.domainId,
                tenantSlug: p.domainSlug,
                purpose,
              }}
            />
            <label>
              Purpose
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="domain_join">Join the domain</option>
                <option value="character_claim">Claim a character</option>
              </select>
            </label>
            {purpose === "character_claim" ? (
              <label>
                Character
                <select name="characterId" required defaultValue="">
                  <option value="">Choose a character</option>
                  {p.claimTargets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Maximum uses
                <input
                  name="maxUses"
                  type="number"
                  min={2}
                  placeholder="Unlimited"
                />
              </label>
            )}
            <button disabled={pending}>
              {pending ? "Creating…" : "Create invitation"}
            </button>
            {state.ok && state.link && (
              <p role="status">
                Copy and share this link: <a href={state.link}>{state.link}</a>
              </p>
            )}
            {!state.ok && state.error && <p role="alert">{state.error}</p>}
            <p>Invitation links are not emailed automatically.</p>
          </form>
        </aside>
        <div>
          <section className={s.panel}>
            <h2>Invitations</h2>
            {p.invitations.map((i) => (
              <article key={i.id} className={s.item}>
                <h3>{i.targetLabel}</h3>
                <p>
                  {i.purpose === "domain_join"
                    ? "Domain join"
                    : "Character claim"}{" "}
                  · {i.statusLabel}
                </p>
                <p>
                  {i.useLabel} · Expires {i.expiresLabel}
                </p>
                <p>Issued by {i.issuedByLabel}</p>
                {i.canRevoke && (
                  <Post
                    action="/api/invitations/revoke"
                    values={{ invitationId: i.id, tenantSlug: p.domainSlug }}
                    confirm="Revoke this invitation link?"
                  >
                    <button>Revoke invitation</button>
                  </Post>
                )}
              </article>
            ))}
            {!p.invitations.length && <Empty>No invitations yet.</Empty>}
          </section>
          <section className={s.panel}>
            <h2>Join requests</h2>
            {p.pendingJoins.map((j) => (
              <article className={s.item} key={j.id}>
                <h3>{j.characterLabel}</h3>
                <p>{j.applicantLabel}</p>
                <Decisions
                  action="/api/invitations/join-decision"
                  values={{ tenantSlug: p.domainSlug, requestId: j.id }}
                />
              </article>
            ))}
            {!p.pendingJoins.length && <Empty>No pending join requests.</Empty>}
          </section>
          <section className={s.panel}>
            <h2>Character claims</h2>
            {p.pendingClaims.map((c) => (
              <article className={s.item} key={c.id}>
                <h3>{c.characterLabel}</h3>
                <p>{c.claimantLabel}</p>
                <Decisions
                  action="/api/character-claims"
                  values={{ tenantSlug: p.domainSlug, claimId: c.id }}
                />
              </article>
            ))}
            {!p.pendingClaims.length && <Empty>No pending claims.</Empty>}
          </section>
        </div>
      </div>
    </section>
  );
}
function Decisions({
  action,
  values,
}: {
  action: string;
  values: Record<string, string | number>;
}) {
  return (
    <div className={s.actions}>
      <Post action={action} values={{ ...values, decision: "approved" }}>
        <button>Approve</button>
      </Post>
      <Post
        action={action}
        values={{ ...values, decision: "rejected" }}
        confirm="Reject this request?"
      >
        <button>Reject</button>
      </Post>
    </div>
  );
}
export function AtelierWork(p: WorkDesignViewProps) {
  return (
    <section className={s.page}>
      <Heading title="Work">What needs your attention.</Heading>
      <Status status={p.status} />
      {p.authorized ? (
        <>
          {p.entries.map((e) => (
            <article key={`${e.kind}-${e.id}`} className={s.panel}>
              <h2>{e.href ? <a href={e.href}>{e.title}</a> : e.title}</h2>
              <p>{e.summary}</p>
              {e.folderName && <p>{e.folderName}</p>}
              {e.kind === "document" ? (
                <div className={s.actions}>
                  {p.approveAction && (
                    <form action={p.approveAction}>
                      <Fields
                        values={{
                          tenantSlug: p.domainSlug,
                          documentId: e.id,
                          operation: "approve",
                        }}
                      />
                      <button>Approve and file</button>
                    </form>
                  )}
                  {p.rejectAction && (
                    <form action={p.rejectAction}>
                      <Fields
                        values={{
                          tenantSlug: p.domainSlug,
                          documentId: e.id,
                          operation: "reject",
                        }}
                      />
                      <button>Return to draft</button>
                    </form>
                  )}
                </div>
              ) : (
                p.domainAdmin && (
                  <a href={`${p.baseUrl}/manage/invitations`}>Review request</a>
                )
              )}
            </article>
          ))}
          {!p.entries.length && (
            <Empty>All caught up. Nothing needs your attention.</Empty>
          )}
        </>
      ) : (
        <Empty>You do not have access to this work queue.</Empty>
      )}
    </section>
  );
}
