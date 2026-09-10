'use client'
import { useState } from 'react'
import type { DesignStudioEditorProps } from '@/lib/design/contracts'
import { palettes, typographyPairs, validateAtelier, contrast, type AtelierConfigV1 } from './config'
import s from './atelier.module.css'
export function AtelierStudio({value,onChange}:DesignStudioEditorProps<AtelierConfigV1>){
 const [error,setError]=useState('')
 const lowContrast=contrast(value.paper,value.ink)<4.5
 function update(next:AtelierConfigV1){const r=validateAtelier(next);if(r.ok){setError('');onChange(r.value)}else setError(r.errors.join(' '))}
 return <div className={s.studio}><h2>Appearance</h2>
 <label>Master palette<select value={value.palette} onChange={e=>{const palette=e.target.value as keyof typeof palettes;const {name,...colors}=palettes[palette];update({...value,...colors,palette})}}>{Object.entries(palettes).map(([key,p])=><option key={key} value={key}>{p.name}</option>)}</select></label>
 <p>Replaces the entire color scheme: canvas, reading surfaces, panels, navigation, feature bands, text, and accent.</p>
 <div className={s.swatches} aria-label="Brand colors">{[value.paper,value.surface,value.panel,value.rail,value.band,value.accent].map((color,i)=><span key={i} style={{background:color}} />)}</div>
 {(['paper','ink','surface','panel','rail','band','accent'] as const).map(key=><label key={key}>{({paper:'Page background',ink:'Page text',surface:'Reading and card backgrounds',panel:'Secondary panels',rail:'Navigation background',band:'Feature bands',accent:'Brand accent'})[key]}<input type="color" value={value[key]} onChange={e=>update({...value,[key]:e.target.value})}/></label>)}
 <p>Page background and text apply directly. Panel, navigation, and band text automatically switches between dark and light for readability.</p>
 {lowContrast&&<p role="status">Page text contrast is low ({contrast(value.paper,value.ink).toFixed(1)}:1). Your colors are applied; choose a lighter background or darker text, or the reverse, for easier reading.</p>}
 {error&&<p role="alert">{error}</p>}
 <label>Typography<select value={value.typography} onChange={e=>update({...value,typography:e.target.value as AtelierConfigV1['typography']})}>{Object.entries(typographyPairs).map(([key,p])=><option key={key} value={key}>{p.name}</option>)}</select></label>
 <p style={{fontFamily:typographyPairs[value.typography].heading,fontSize:24}}>A place for your stories.</p>
 <p>Paired system fonts with fallbacks; no external font downloads.</p>
 <label>Spacing<select value={value.density} onChange={e=>update({...value,density:e.target.value as AtelierConfigV1['density']})}><option value="compact">Compact</option><option value="comfortable">Balanced</option><option value="airy">Airy</option></select></label>
 <p>Page breathing room, section gaps, cards, navigation, and record rows.</p>
 <label>Dividers<select value={value.ruleWeight} onChange={e=>update({...value,ruleWeight:Number(e.target.value)})}><option value="1">Fine</option><option value="2">Defined</option><option value="3">Strong</option></select></label>
 <p>Navigation, list, table, and section rule thickness.</p></div>
}
