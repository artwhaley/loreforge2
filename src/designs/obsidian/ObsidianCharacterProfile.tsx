import type { PersonManagementPageModel } from '@/lib/page-models/management/people'
import { PersonBody } from '../shared/operational/bodies'

/** Obsidian CharacterProfile is the authorized person workspace projection. */
export function ObsidianCharacterProfile({ model }: { model: PersonManagementPageModel }) {
  return <PersonBody {...model} />
}
