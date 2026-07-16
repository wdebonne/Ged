export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

// Liste de cartes façon "courrier" (icône/checkbox + lignes de texte + avatar)
export function SkeletonMailList({ count = 5 }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 border-l-4 border-gray-100 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-2/3" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Lignes de tableau (thead conservé, tbody remplacé)
export function SkeletonTableRows({ rows = 6, columns = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-4">
              <Skeleton className={`h-4 ${c === 0 ? 'w-20' : 'w-full max-w-[10rem]'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Grille de cartes statistiques (dashboard)
export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
