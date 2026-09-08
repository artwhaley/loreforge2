'use client'

import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import { useDocumentTypesManagementWorkspace } from '@/components/functional/document-types/useDocumentTypesManagementWorkspace'

import { TypeTree } from './TypeTree'
import { TypeInspector } from './TypeInspector'

/**
 * Civic Document Types browser (OBSIDIAN-T05). Presentation-only: the
 * authorized Page Model carries the resolved tree/inspector, and the shared
 * workspace owns the selection state. All data is resolved server-side —
 * Unassigned semantics, Department roots, manual type folders, and Type nodes
 * stay exactly as `resolveTypeTree` produces them.
 */
export function DocumentTypesBrowser({ model }: { model: DocumentTypesManagementPageModel }) {
  const workspace = useDocumentTypesManagementWorkspace(model)
  const { domainSlug, tree, canManage, inspector } = model

  return <div style={{ display: 'grid', gap: '1.1rem' }}>
    <TypeTree
      domainSlug={domainSlug}
      data={tree}
      canManage={canManage}
      selectedTypeId={workspace.selectedTypeId}
      onSelectType={workspace.selectType}
      onCreateNew={canManage ? workspace.beginCreate : undefined}
    />
    {canManage && (workspace.creating || workspace.selectedLeaf) ? <TypeInspector
      key={workspace.creating ? 'create' : `type-${workspace.selectedLeaf!.id}`}
      mode={workspace.creating ? 'create' : 'edit'}
      domainSlug={domainSlug}
      leaf={workspace.selectedLeaf}
      departments={tree.departments}
      typeFolders={workspace.typeFolders}
      roles={inspector.roles}
      folders={inspector.folders}
      stages={workspace.creating || !workspace.selectedLeaf ? null : (inspector.stagesByType[workspace.selectedLeaf.id] ?? null)}
      defaultDepartmentId={workspace.selectedLeaf?.departmentId ?? null}
      onCreated={workspace.finishCreate}
      onDuplicate={workspace.selectType}
      onCancel={workspace.creating ? workspace.cancelCreate : undefined}
    /> : null}
  </div>
}