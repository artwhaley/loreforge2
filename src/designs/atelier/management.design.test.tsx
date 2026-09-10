import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEPARTMENTS_MANAGEMENT_MODEL, FOLDERS_MANAGEMENT_MODEL, ROLES_MANAGEMENT_MODEL, DOCUMENT_TYPES_MANAGEMENT_MODEL, PEOPLE_MANAGEMENT_MODEL, PERSON_MANAGEMENT_MODEL, INVITATIONS_MANAGEMENT_MODEL, WORK_MANAGEMENT_MODEL } from '@/lib/design/fixtures'
import { AtelierManageDepartments, AtelierFolders, AtelierRoles, AtelierDocumentTypes, AtelierPeople, AtelierPerson, AtelierInvitations, AtelierWork } from './management'
import { atelierConfig } from './config'

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()}),usePathname:()=>'/domain/preview-domain',useSearchParams:()=>new URLSearchParams()}))
vi.mock('@/lib/design/hostActionBridges',()=>({issueInvitationAction:vi.fn(async()=>({ok:true,link:'/invite/test'})),duplicateTypeAction:vi.fn(async()=>({ok:true})),setActiveTypeAction:vi.fn(async()=>({ok:true}))}))
vi.mock('@/lib/actions/documentTypes',()=>({createTypeAction:vi.fn(),updateTypeAction:vi.fn(),duplicateTypeAction:vi.fn(),scaffoldTypeTemplateAction:vi.fn()}))
afterEach(()=>cleanup())
describe('Atelier portable management slots',()=>{
 const cases=[
  <AtelierManageDepartments key="departments" {...DEPARTMENTS_MANAGEMENT_MODEL}/>,
  <AtelierFolders key="folders" {...FOLDERS_MANAGEMENT_MODEL}/>,
  <AtelierRoles key="roles" {...ROLES_MANAGEMENT_MODEL}/>,
  <AtelierDocumentTypes key="types" {...DOCUMENT_TYPES_MANAGEMENT_MODEL}/>,
  <AtelierPeople key="people" {...PEOPLE_MANAGEMENT_MODEL}/>,
  <AtelierPerson key="person" {...PERSON_MANAGEMENT_MODEL}/>,
  <AtelierInvitations key="invitations" {...INVITATIONS_MANAGEMENT_MODEL}/>,
  <AtelierWork key="work" {...WORK_MANAGEMENT_MODEL} approveAction={vi.fn()} rejectAction={vi.fn()}/>,
 ]
 for(const element of cases)it(`renders ${element.key} using canonical model facts`,()=>{
  const {container}=render(element)
  expect(screen.getByRole('heading',{level:1})).toBeTruthy()
  expect(container.textContent).not.toMatch(/connections will follow|preview only/i)
 })
 it('gates department creation on canCreate',()=>{
  render(<AtelierManageDepartments {...DEPARTMENTS_MANAGEMENT_MODEL} canCreate={false}/>)
  expect(screen.queryByRole('button',{name:'Create department'})).toBeNull()
 })
 it('gates invitation actions on canManage',()=>{
  render(<AtelierInvitations {...INVITATIONS_MANAGEMENT_MODEL} canManage={false}/>)
  expect(screen.queryByRole('button',{name:'Create invitation'})).toBeNull()
 })
 it('does not expose the editor to a document type viewer',()=>{
  render(<AtelierDocumentTypes {...DOCUMENT_TYPES_MANAGEMENT_MODEL} canManage={false}/>)
  fireEvent.click(screen.getByRole('button',{name:DOCUMENT_TYPES_MANAGEMENT_MODEL.tree.types[0].name}))
  expect(screen.queryByRole('button',{name:'Configure type'})).toBeNull()
 })
 it('preserves existing production Atelier settings on migration',()=>{
  const result=atelierConfig.migrate(1,{paper:'clay',accent:'#924c38',typography:'classical',density:'compact',ruleWeight:2})
  expect(result.ok).toBe(true)
  if(result.ok){expect(result.value.paper).toBe('#e5d6c5');expect(result.value.typography).toBe('classical');expect(result.value.ruleWeight).toBe(2)}
 })
})
