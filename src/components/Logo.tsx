export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="WantBy">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32"><path d="M6 8l4 16 6-10 6 10 4-16" /><path className="brand-check" d="M21 6l2 2 4-5" /></svg>
      </span>
      {compact ? null : <span className="brand-name">WantBy</span>}
    </div>
  )
}
