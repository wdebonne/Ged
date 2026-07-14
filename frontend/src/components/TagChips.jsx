// Chips de tags colorées — la couleur est dérivée du nom du tag (stable)
const TAG_COLORS = [
  'bg-indigo-50 text-indigo-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-sky-50 text-sky-700',
  'bg-rose-50 text-rose-700',
  'bg-violet-50 text-violet-700',
  'bg-teal-50 text-teal-700',
  'bg-orange-50 text-orange-700'
];

export function tagColorClass(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export default function TagChips({ tags, onClick, className = '' }) {
  if (!tags || tags.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          onClick={onClick ? (e) => { e.preventDefault(); e.stopPropagation(); onClick(tag); } : undefined}
          className={`badge ${tagColorClass(tag)} ${onClick ? 'cursor-pointer hover:opacity-75' : ''}`}
          title={onClick ? `Filtrer sur "${tag}"` : undefined}
        >
          #{tag}
        </span>
      ))}
    </span>
  );
}
