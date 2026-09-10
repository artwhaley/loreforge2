import type { DesignDefinition } from '@/lib/design/types'
import type { ValidationResult } from '@/lib/design/contracts'
import { isHexColor } from '@/lib/design/validate'
export const palettes = {
 parchment:{name:'Parchment',paper:'#f1ecdf',ink:'#292b28',accent:'#924c38',surface:'#fffaf0',panel:'#dfcfb4',rail:'#292b28',band:'#713c2d'},
 coast:{name:'Coast',paper:'#ffffff',ink:'#132a47',accent:'#174bb4',surface:'#e1edff',panel:'#b9d5f3',rail:'#e1edff',band:'#174bb4'},
 botanical:{name:'Botanical',paper:'#182f27',ink:'#f5efdc',accent:'#d9cb83',surface:'#26483b',panel:'#3b5944',rail:'#e5dfc4',band:'#d9cb83'},
 plum:{name:'Plum',paper:'#ecd2ce',ink:'#392236',accent:'#72264d',surface:'#fff2e6',panel:'#cfb0ba',rail:'#482b46',band:'#fff2e6'},
 midnight:{name:'Midnight',paper:'#11141b',ink:'#eceef5',accent:'#b6afff',surface:'#222635',panel:'#32364c',rail:'#090b10',band:'#514576'},
} as const
export const typographyPairs = {
 editorial:{name:'Editorial',heading:'Georgia, serif',body:'Arial, sans-serif'},
 classical:{name:'Literary',heading:'Palatino Linotype, Book Antiqua, Palatino, serif',body:'Trebuchet MS, sans-serif'},
 modern:{name:'Modern',heading:'Arial, Helvetica, sans-serif',body:'Arial, Helvetica, sans-serif'},
 humanist:{name:'Humanist',heading:'Trebuchet MS, sans-serif',body:'Verdana, sans-serif'},
 traditional:{name:'Traditional',heading:'Times New Roman, serif',body:'Tahoma, sans-serif'},
 technical:{name:'Technical',heading:'Courier New, monospace',body:'Arial, sans-serif'},
} as const
export type AtelierConfigV1 = {palette:keyof typeof palettes;paper:string;ink:string;accent:string;surface:string;panel:string;rail:string;band:string;typography:keyof typeof typographyPairs;density:'compact'|'comfortable'|'airy';ruleWeight:number}
export const atelierDefaults:AtelierConfigV1={palette:'parchment',paper:'#f1ecdf',ink:'#292b28',accent:'#924c38',surface:'#fffaf0',panel:'#dfcfb4',rail:'#292b28',band:'#713c2d',typography:'editorial',density:'comfortable',ruleWeight:1}
function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(v=>{const n=parseInt(v,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
export function validateAtelier(raw:unknown):ValidationResult<AtelierConfigV1>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,errors:['Settings must be an object.']}
 const v=raw as AtelierConfigV1;const errors:string[]=[]
 if(Object.keys(v).some(k=>!Object.keys(atelierDefaults).includes(k)))errors.push('Unsupported setting.')
 if(!Object.hasOwn(palettes,v.palette))errors.push('Choose a palette.')
 if(!Object.hasOwn(typographyPairs,v.typography))errors.push('Choose a font pairing.')
 if(![v.paper,v.ink,v.accent,v.surface,v.panel,v.rail,v.band].every(isHexColor))errors.push('Use six-digit hex colors.')
 if(!['compact','comfortable','airy'].includes(v.density))errors.push('Choose spacing.')
 if(![1,2,3].includes(v.ruleWeight))errors.push('Choose divider weight.')
 return errors.length?{ok:false,errors}:{ok:true,value:{...v}}
}
export const atelierConfig:DesignDefinition<AtelierConfigV1>['config']={
 version:3,defaults:atelierDefaults,validate:validateAtelier,
 migrate(version,raw){
  if(version===3)return validateAtelier(raw)
  if(version===2&&raw&&typeof raw==='object'){const v=raw as AtelierConfigV1;const p=palettes[v.palette]??palettes.parchment;return validateAtelier({...v,surface:p.surface,panel:p.panel,rail:p.rail,band:p.band})}
  if(version===1&&raw&&typeof raw==='object'){
   const old=raw as Record<string,unknown>
   const next={...atelierDefaults,...old,palette:'parchment',ink:atelierDefaults.ink,paper:({ivory:'#f1ecdf',chalk:'#f7f5ee',clay:'#e5d6c5'} as Record<string,string>)[String(old.paper)]??atelierDefaults.paper}
   const result=validateAtelier(next);return result.ok?result:validateAtelier({...next,accent:atelierDefaults.ink})
  }
  return {ok:false,errors:['Unsupported Atelier version.']}
 },
 resolveTheme(c){
  const readable=(bg:string)=>contrast(bg,'#ffffff')>contrast(bg,'#171717')?'#ffffff':'#171717'
  const f=typographyPairs[c.typography];const mix=(n:number)=>'color-mix(in srgb, '+c.ink+' '+n+'%, '+c.paper+')'
  const z={compact:[12,24,20],comfortable:[20,44,30],airy:[28,64,40]}[c.density]
  return {base:{primary:c.ink,secondary:c.panel,accent:c.accent,pageBg:c.paper,surfaceBg:c.surface,surfaceBorder:mix(30),textOnPrimary:c.paper,headingFont:f.heading,bodyFont:f.body,mutedText:mix(75)},vars:{
   '--atelier-paper':c.paper,'--atelier-ink':c.ink,'--atelier-accent':c.accent,'--atelier-heading':f.heading,'--atelier-body':f.body,
   '--atelier-surface':c.surface,'--atelier-panel':c.panel,'--atelier-rail':c.rail,'--atelier-band':c.band,'--atelier-on-surface':readable(c.surface),'--atelier-on-panel':readable(c.panel),'--atelier-on-rail':readable(c.rail),'--atelier-on-band':readable(c.band),'--atelier-border':mix(30),'--atelier-muted':mix(75),
   '--atelier-rule':c.ruleWeight+'px','--atelier-row':z[0]+'px','--atelier-space':z[1]+'px','--atelier-card':z[2]+'px',
  }}
 },
}
