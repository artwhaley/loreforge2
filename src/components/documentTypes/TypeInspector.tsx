'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'

import { createTypeAction, updateTypeAction, scaffoldTypeTemplateAction, type LifecycleStageConfigInput } from '@/lib/actions/documentTypes'
import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABELS, stageFolderId, stageRoleIds, type LifecycleStageRowShape } from '@/lib/documents/lifecycleStages'
import type { Lifecycle } from '@/lib/documents/lifecycle'
import type { InspectorFolderNode, InspectorRole, TypeTreeLeaf, TemplateSelection } from '@/lib/documents/typeTree'

import { FolderPickerPopup } from './FolderPickerPopup'
import { RoleListEditor } from './RoleListEditor'
import styles from './TypeTree.module.scss'

const KIND_LABELS: Record<TemplateSelection, string> = { blank: 'Blank Document', markdown: 'Markdown Template', form: 'Form Template' }
const KIND_DESCRIPTIONS: Record<TemplateSelection, string> = {
  blank: 'Blank Document — authors start from an empty page; no template is attached.',
  markdown: 'Markdown Template — authors start from the composed Markdown body template.',
  form: 'Form Template — authors fill the structured form built in the Form Studio.',
}

const STAGE_DESCRIPTIONS: Record<Lifecycle, string> = {
  draft: 'Draft — work in progress. Writers create and edit their own drafts; with permission, others review them.',
  submitted: 'Submitted — awaits review before filing.',
  filed: 'Filed — the live record of the archive.',
  deprecated: 'Deprecated — superseded or retired; kept for provenance, not in active use.',
}

const ROLE_DEFINITIONS: Array<{ key: 'readRoleIds' | 'writeRoleIds' | 'editOthersRoleIds' | 'manageRoleIds'; label: string; title: string }> = [
  { key: 'readRoleIds', label: 'Read', title: 'View documents at this stage.' },
  { key: 'writeRoleIds', label: 'Write', title: 'Create documents at this stage and edit my own at this stage.' },
  { key: 'editOthersRoleIds', label: 'Edit others', title: 'Edit other people\u2019s documents at this stage directly.' },
  { key: 'manageRoleIds', label: 'Manage', title: 'Change a document\u2019s lifecycle stage into this one \u2014 moves it to this stage\u2019s folder.' },
]

type StageDraft = {
  enabled: boolean
  allowOnCreation: boolean
  folderId: number | null
  privateDraftsAllowed: boolean
  readRoleIds: number[]
  writeRoleIds: number[]
  editOthersRoleIds: number[]
  manageRoleIds: number[]
}

const emptyStage = (): StageDraft => ({ enabled: false, allowOnCreation: false, folderId: null, privateDraftsAllowed: false, readRoleIds: [], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [] })

/** Matches the T02 seed defaults so an unconfigured row round-trips stably. */
function seedStage(stage: Lifecycle): StageDraft {
  return {
    enabled: stage === 'draft' || stage === 'filed',
    allowOnCreation: stage === 'draft',
    folderId: null,
    privateDraftsAllowed: stage === 'draft',
    readRoleIds: [], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [],
  }
}

function rowToDraft(row: LifecycleStageRowShape | null | undefined, stage: Lifecycle): StageDraft {
  if (!row) return seedStage(stage)
  return {
    enabled: Boolean(row.enabled),
    allowOnCreation: Boolean(row.allowOnCreation),
    folderId: stageFolderId(row),
    privateDraftsAllowed: Boolean(row.privateDraftsAllowed),
    readRoleIds: stageRoleIds(row, 'readRoles'),
    writeRoleIds: stageRoleIds(row, 'writeRoles'),
    editOthersRoleIds: stageRoleIds(row, 'editOthersRoles'),
    manageRoleIds: stageRoleIds(row, 'manageRoles'),
  }
}

function folderNameOf(folders: InspectorFolderNode[], id: number | null): string | null {
  if (id == null) return null
  const walk = (list: InspectorFolderNode[]): string | null => {
    for (const node of list) {
      if (node.id === id) return node.name
      const found = walk(node.children)
      if (found) return found
    }
    return null
  }
  return walk(folders)
}

export function TypeInspector({ domainSlug, mode, leaf, departments, typeFolders, roles, folders, stages, defaultDepartmentId, onCreated, onCancel }: {
  domainSlug: string
  mode: 'create' | 'edit'
  leaf: TypeTreeLeaf | null
  departments: Array<{ id: number; name: string; archived: boolean }>
  typeFolders: Array<{ id: number; name: string; departmentId: number | null; depth: number }>
  roles: InspectorRole[]
  folders: InspectorFolderNode[]
  stages: Record<Lifecycle, LifecycleStageRowShape | null> | null
  defaultDepartmentId: number | null
  onCreated: (typeId: number) => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const [name, setName] = useState(leaf?.name ?? '')
  const [description, setDescription] = useState(leaf?.description ?? '')
  const [active, setActive] = useState(leaf?.active ?? true)
  const [departmentId, setDepartmentId] = useState<number | null>(leaf?.departmentId ?? defaultDepartmentId ?? null)
  const [typeFolderId, setTypeFolderId] = useState<number | null>(leaf?.typeFolderId ?? null)
  const [templateSelection, setTemplateSelection] = useState<TemplateSelection>(leaf?.templateSelection ?? 'blank')
  const [stageDrafts, setStageDrafts] = useState<Record<Lifecycle, StageDraft>>(() => {
    const out = {} as Record<Lifecycle, StageDraft>
    for (const stage of LIFECYCLE_STAGES) out[stage] = rowToDraft(stages?.[stage] ?? null, stage)
    return out
  })
  const [folderPickerStage, setFolderPickerStage] = useState<Lifecycle | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const activeDepartments = useMemo(() => departments.filter((department) => !department.archived), [departments])
  const folderOptions = useMemo(() => typeFolders.filter((folder) => folder.departmentId === departmentId), [typeFolders, departmentId])

  const setStage = (stage: Lifecycle, patch: Partial<StageDraft>) => setStageDrafts((current) => ({ ...current, [stage]: { ...current[stage], ...patch } }))

  const run = useCallback(async (operation: () => Promise<{ ok: boolean; error?: string }>) => {
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      const result = await operation()
      if (!result.ok) setNotice(result.error ?? 'That change could not be saved.')
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }, [busy, router])

  const stagesToConfig = (): LifecycleStageConfigInput[] => LIFECYCLE_STAGES.map((stage) => {
    const draft = stageDrafts[stage]
    return {
      stage,
      enabled: draft.enabled,
      allowOnCreation: draft.allowOnCreation,
      folderId: draft.folderId,
      privateDraftsAllowed: draft.privateDraftsAllowed,
      readRoleIds: draft.readRoleIds,
      writeRoleIds: draft.writeRoleIds,
      editOthersRoleIds: draft.editOthersRoleIds,
      manageRoleIds: draft.manageRoleIds,
    }
  })

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setNotice('Give the Document Type a name.'); return }
    if (departmentId == null) { setNotice('Choose a Department — Document Types never live in Unassigned by choice.'); return }
    const lifecycleStages = stagesToConfig()
    if (!lifecycleStages.some((stage) => stage.enabled)) { setNotice('Enable at least one lifecycle stage — a Document Type needs somewhere for its records to live.'); return }
    if (!isEdit) {
      const result = await createTypeAction({ domainSlug, name: trimmed, description, active, departmentId, typeFolderId, templateSelection, lifecycleStages })
      if (result.ok && result.typeId) onCreated(result.typeId)
      else setNotice(result.error ?? 'That Type could not be created.')
      return
    }
    if (!leaf) return
    await run(() => updateTypeAction({ domainSlug, typeId: leaf.id, name: trimmed, description, active, departmentId, typeFolderId, templateSelection, lifecycleStages }))
  }

  const scaffold = async (kind: 'markdown' | 'form') => {
    if (!leaf) return
    await run(() => scaffoldTypeTemplateAction({ domainSlug, typeId: leaf.id, kind }))
  }

  const constructed = leaf?.constructedTemplates ?? { markdown: null, form: null }
  const chosenTemplate = templateSelection === 'markdown' ? constructed.markdown : templateSelection === 'form' ? constructed.form : null

  return <section className={styles.inspectorForm} aria-label={isEdit ? `Document Type inspector — ${leaf?.name ?? ''}` : 'New Document Type'}>
    <div className={styles.inspectorSection}>
      <div className={styles.identityHeader}>
        <h3>{isEdit ? 'Document Type' : 'New Document Type'}</h3>
        <span className={active ? `${styles.badge} ${styles.badgeActive}` : `${styles.badge} ${styles.badgeInactive}`} title={active ? 'Active — available for new documents.' : 'Inactive — not offered for new documents, still editable.'}>{active ? 'Active' : 'Inactive'}</span>
      </div>
      <div className={styles.field}>
        <label>Name</label>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Deed of Transfer" title="The Document Type name — shown on the tree line card and offered on the create-document screen." />
      </div>
      <div className={styles.field}>
        <label>Description</label>
        <textarea value={description ?? ''} onChange={(event) => setDescription(event.target.value)} title="What this Document Type is for — shown as hovertext on the tree line card." placeholder="What is this Type for?" />
      </div>
      <label className={styles.checkRow} title="Inactive Types stay editable and visible, but greyed out with an (inactive) suffix and not offered for new documents.">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
        Active
        <small>— inactive Types stay editable but aren\u2019t offered for new documents.</small>
      </label>
    </div>

    <div className={styles.inspectorSection}>
      <h3>Placement</h3>
      <p>Which Department this Type belongs to, and the optional manual subfolder beneath it. Unassigned is never a choice — it only collects Types whose Department was archived.</p>
      <div className={styles.field}>
        <label>Department</label>
        <select
          value={departmentId == null ? '' : String(departmentId)}
          onChange={(event) => { const id = event.target.value === '' ? null : Number(event.target.value); setDepartmentId(id); if (id !== departmentId) setTypeFolderId(null) }}
          title="The Department root this Type hangs under. Required — a Type always belongs to a Department."
        >
          <option value="" disabled>— Choose a Department —</option>
          {activeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
      </div>
      {activeDepartments.length > 0 && departmentId != null ? <div className={styles.field}>
        <label>Subfolder</label>
        <select
          value={typeFolderId == null ? '' : String(typeFolderId)}
          onChange={(event) => setTypeFolderId(event.target.value === '' ? null : Number(event.target.value))}
          title="Optional manual navigation subfolder under the Department. Create subfolders from the tree\u2019s right-click menu."
        >
          <option value="">— None (Department root) —</option>
          {folderOptions.map((folder) => <option key={folder.id} value={folder.id}>{'\u00b7 '.repeat(folder.depth)}{folder.name}</option>)}
        </select>
      </div> : null}
    </div>

    <div className={styles.inspectorSection}>
      <h3>Template</h3>
      <p>Blank needs nothing. A Markdown or Form template is composed once and stays saved even if you switch Type kinds for a while — switching back brings it back.</p>
      <div className={styles.segmented} role="group" aria-label="Template type">
        {(Object.keys(KIND_LABELS) as TemplateSelection[]).map((selection) => (
          <button
            key={selection}
            type="button"
            className={templateSelection === selection ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
            aria-pressed={templateSelection === selection}
            title={KIND_DESCRIPTIONS[selection]}
            onClick={() => setTemplateSelection(selection)}
          >{KIND_LABELS[selection]}</button>
        ))}
      </div>
      {templateSelection === 'blank' ? <p className={styles.templateLinkRow} title="Blank Document — no template is attached. Constructed templates you made earlier are kept and will return if you switch back.">Blank Document — no template attached. Any templates built earlier are kept and return if you switch back.</p> : null}
      {templateSelection !== 'blank' ? <div className={styles.templateLinkRow}>
        {chosenTemplate ? <>
          <span title={`The constructed ${KIND_LABELS[templateSelection]} for this Type — editing it does not affect any other Type or template.`}>
            {templateSelection === 'form' ? 'Form Template' : 'Markdown Template'}: <Link href={`/domain/${domainSlug}/${templateSelection === 'form' ? 'forms' : 'templates'}/${chosenTemplate.id}/edit`} title={`Open ${chosenTemplate.name} in the ${templateSelection === 'form' ? 'Form Studio' : 'template editor'}.`}>{chosenTemplate.name}</Link>
          </span>
        </> : isEdit ? <>
          <span>No {KIND_LABELS[templateSelection]} exists yet.</span>
          <button type="button" title={`Create the default ${KIND_LABELS[templateSelection]} for this Type and open it for editing.`} onClick={() => void scaffold(templateSelection === 'form' ? 'form' : 'markdown')}>Create {KIND_LABELS[templateSelection]}</button>
        </> : <span>Created Types get a fresh {KIND_LABELS[templateSelection]} — build it after saving.</span>}
      </div> : null}
    </div>

    <div className={styles.inspectorSection}>
      <h3>Lifecycle</h3>
      <p>Each row is one stage of a document\u2019s life. Check a stage to make it part of this Type\u2019s lifecycle; the rest of the row then configures it. Some Types file straight into their home folder (only Filed enabled); others walk the full path.</p>
      <div style={{ overflowX: 'auto' }}>
        <div className={styles.lifecycleTable}>
          {LIFECYCLE_STAGES.map((stage) => {
            const draft = stageDrafts[stage]
            return <div key={stage} className={draft.enabled ? styles.stageRow : `${styles.stageRow} ${styles.stageRowDisabled}`} data-stage={stage}>
              <div className={styles.stageHead}>
                <label className={styles.checkRow} title={`${STAGE_DESCRIPTIONS[stage]} Check to make ${LIFECYCLE_STAGE_LABELS[stage]} part of this Type\u2019s lifecycle; unchecking disables the rest of this row.`}>
                  <input type="checkbox" checked={draft.enabled} disabled={busy} onChange={(event) => setStage(stage, { enabled: event.target.checked })} />
                  <span className={styles.stageTitle}>{LIFECYCLE_STAGE_LABELS[stage]}</span>
                </label>
                {stage === 'draft' ? <label className={styles.checkRow} title="When on, creators choose private or public draft at creation. Private drafts are visible only to the creating Character; public drafts are visible to anyone with read permission over the Type.">
                  <input type="checkbox" checked={draft.privateDraftsAllowed} disabled={busy || !draft.enabled} onChange={(event) => setStage(stage, { privateDraftsAllowed: event.target.checked })} />
                  <small>Private drafts allowed</small>
                </label> : null}
                <span className={styles.stageDesc}>{STAGE_DESCRIPTIONS[stage]}</span>
              </div>
              <div className={styles.stageCell}>
                <span>Allow on creation</span>
                <label className={styles.checkRow} title="When on, the create-document screen can start a record in this stage (subject to the actor\u2019s stage permission). If several stages allow creation, the creator gets a dropdown defaulting to the latest stage they may set.">
                  <input type="checkbox" checked={draft.allowOnCreation} disabled={busy || !draft.enabled} onChange={(event) => setStage(stage, { allowOnCreation: event.target.checked })} />
                </label>
              </div>
              <div className={styles.stageCell}>
                <span>Stage folder</span>
                <button type="button" className={draft.folderId == null ? `${styles.folderButton} ${styles.folderButtonEmpty}` : styles.folderButton} disabled={busy || !draft.enabled} title="The folder documents at this stage live in. Click to open the folder navigator; transitions into this stage move records here automatically." onClick={() => setFolderPickerStage(stage)}>
                  {folderNameOf(folders, draft.folderId) ?? '\u2014 none \u2014'}
                </button>
              </div>
              {ROLE_DEFINITIONS.map((roleDef) => (
                <div className={styles.stageCell} key={roleDef.key}>
                  <span title={roleDef.title}>{roleDef.label}</span>
                  <RoleListEditor
                    label=""
                    title={roleDef.title}
                    roles={roles}
                    selected={draft[roleDef.key]}
                    onChange={(ids) => setStage(stage, { [roleDef.key]: ids } as Partial<StageDraft>)}
                  />
                </div>
              ))}
            </div>
          })}
        </div>
      </div>
    </div>

    {folderPickerStage ? <FolderPickerPopup
      folders={folders}
      currentId={stageDrafts[folderPickerStage].folderId}
      onPick={(id) => { setStage(folderPickerStage, { folderId: id }); setFolderPickerStage(null) }}
      onClear={() => { setStage(folderPickerStage, { folderId: null }); setFolderPickerStage(null) }}
      onClose={() => setFolderPickerStage(null)}
    /> : null}

    {notice ? <p className={styles.notice} role="alert">{notice}</p> : null}
    <div className={styles.saveBar}>
      <button type="button" className={styles.primary} disabled={busy} title="Save this Document Type and its lifecycle configuration." onClick={() => void save()}>{isEdit ? 'Save Type' : 'Create Type'}</button>
      {isEdit ? <span className={styles.popupNote}>Changes apply to the Type immediately — new documents and transitions use them.</span> : null}
      <span className={styles.spacer} />
      {onCancel ? <button type="button" className={styles.secondary} disabled={busy} onClick={onCancel}>Cancel</button> : null}
    </div>
  </section>
}