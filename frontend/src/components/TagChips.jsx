// Chips de tags colorées — la couleur est dérivée du nom du tag (stable)
const TAG_COLORS = [
  'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
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
