import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { tagColorClass } from './TagChips';

// Saisie de tags sous forme de chips : Entrée ou virgule pour ajouter
export default function TagInput({ value = [], onChange, placeholder = 'Ajouter un tag (Entrée ou virgule)' }) {
  const [input, setInput] = useState('');

  const addTag = (raw) => {
    const tag = (raw ?? input).trim().replace(/,+$/, '').trim();
    if (tag && !value.some(t => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setInput('');
  };

  const removeTag = (tag) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="input flex flex-wrap items-center gap-1 h-auto min-h-[42px] py-1.5">
      {value.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${tagColorClass(tag)}`}
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:opacity-60"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag()}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] border-0 outline-none focus:ring-0 p-0 text-sm bg-transparent"
      />
    </div>
  );
}
