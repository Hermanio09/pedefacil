export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="skeleton"
              style={{ height: 14, flex: j === 0 ? 2 : 1, opacity: 1 - i * 0.08 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "var(--radius)" }} />
          <div>
            <div className="skeleton" style={{ width: 60, height: 26, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 90, height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
