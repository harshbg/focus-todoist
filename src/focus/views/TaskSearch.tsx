import { useState } from 'react';
import type { Item } from '@/domain/types';
import { searchTasks } from '../domain/queue';
import { useT } from '@/hooks/useT';

interface TaskSearchProps {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: Item) => void;
  onCreate?: () => void;
  selectedId?: string | null;
  placeholder: string;
}

export function TaskSearch({ items, value, onChange, onSelect, onCreate, selectedId, placeholder }: TaskSearchProps) {
  const { t } = useT();
  const [active, setActive] = useState(0);
  const matches = selectedId ? [] : searchTasks(items, value);
  return (
    <div className="fx-field">
      <input
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        onChange={(event) => { onChange(event.target.value); setActive(0); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && matches.length) {
            event.preventDefault();
            setActive((index) => (index + 1) % matches.length);
          } else if (event.key === 'ArrowUp' && matches.length) {
            event.preventDefault();
            setActive((index) => (index - 1 + matches.length) % matches.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (matches[active]) onSelect(matches[active]);
            else if (value.trim()) onCreate?.();
          }
        }}
      />
      {matches.length > 0 && (
        <ul className="fx-suggest" aria-label={t('focus.suggestions')}>
          {matches.map((item, index) => (
            <li key={item.id} className={index === active ? 'is-active' : ''}>
              <button type="button" onClick={() => onSelect(item)}>{item.content}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
