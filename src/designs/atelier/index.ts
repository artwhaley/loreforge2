import type { DesignDefinition } from '@/lib/design/types'
import { atelierConfig, type AtelierConfigV1 } from './config'
import { AtelierShell } from './AtelierShell'
import { AtelierStudio } from './AtelierStudio'
import { AtelierHome,AtelierAbout,AtelierLore,AtelierDepartments,AtelierDepartment,AtelierDocument,AtelierCharacterProfile } from './public'
import { AtelierRecords,AtelierMembers,AtelierWork,AtelierManageDepartments,AtelierFolders,AtelierRoles,AtelierDocumentTypes,AtelierPeople,AtelierPerson,AtelierInvitations } from './workspaces'
export const atelierDesign:DesignDefinition<AtelierConfigV1>={
 key:'atelier',status:'first-class',name:'Atelier',description:'Warm editorial modernism: ivory paper, charcoal navigation, copper accents, and a considered working archive.',
 preview:{thumbnail:'/design-assets/atelier/thumbnail.svg'},config:atelierConfig,studio:{Editor:AtelierStudio},Shell:AtelierShell,
 pages:{home:AtelierHome,records:AtelierRecords,document:AtelierDocument,departments:AtelierDepartments,department:AtelierDepartment,about:AtelierAbout,lore:AtelierLore,members:AtelierMembers,work:AtelierWork,characterProfile:AtelierCharacterProfile,management:{departments:AtelierManageDepartments,folders:AtelierFolders,roles:AtelierRoles,documentTypes:AtelierDocumentTypes,people:AtelierPeople,person:AtelierPerson,invitations:AtelierInvitations}}
}
export default atelierDesign
