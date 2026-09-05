'use client'

import { useRef } from 'react'

import type { Tenant } from '@/payload-types'

import styles from './TenantShell.module.scss'

export function DomainSwitcher({ tenants, currentTenant, disabled }: { tenants: Tenant[]; currentTenant: Tenant; disabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action="/api/switch-tenant" method="post" className={styles.contextControl}>
      <label htmlFor="tenant-switcher" className={styles.contextLabel}>Domain</label>
      <select id="tenant-switcher" name="tenantSlug" defaultValue={currentTenant.slug} className={styles.contextSelect} disabled={disabled} onChange={() => formRef.current?.requestSubmit()}>
        {tenants.length === 0 ? <option value={currentTenant.slug}>{currentTenant.name}</option> : null}
        {tenants.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
      </select>
    </form>
  )
}