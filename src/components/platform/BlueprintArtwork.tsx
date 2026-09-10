import styles from './PlatformShell.module.scss'

/** Engraved crosshatch: crisp vector linework, no literal objects or external assets. */
export function BlueprintArtwork({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <div className={`${styles.blueprint} ${styles.blueprintCompact}`} data-blueprint data-reveal aria-hidden="true" />
  }
  return (
    <div className={styles.blueprint} data-blueprint data-reveal aria-hidden="true">
      <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMid slice" fill="none" className={styles.blueprintDrawing}>
        <g stroke="currentColor" strokeWidth=".8">
          {Array.from({ length: 220 }, (_, i) => (
            <path key={i} d={`M${i * 9 - 400} 440 L${i * 9 + 40} -20`} />
          ))}
        </g>
        <g className={styles.hatchCounterlines} stroke="currentColor" strokeWidth=".6">
          {Array.from({ length: 100 }, (_, i) => (
            <path key={i} d={`M${i * 17 - 220} -20 L${i * 17 + 220} 440`} />
          ))}
        </g>
      </svg>
      <span className={styles.hatchPlate} />
      <span className={styles.hatchEdge} />
    </div>
  )
}
