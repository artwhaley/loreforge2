import type { PersonManagementPageModel } from '@/lib/page-models/management/people'
import { ObsidianPersonManagement } from './ObsidianOperationalSurfaces'
import { PersonBody } from '../shared/operational/bodies'

/** Obsidian CharacterProfile keeps the source management composition while
 * leaving the existing role/folder/type controls available under Access details. */
export function ObsidianCharacterProfile({ model }: { model: PersonManagementPageModel }) {
  return <ObsidianPersonManagement model={model} details={<PersonBody {...model} />} />
}
