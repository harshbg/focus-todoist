import { useState } from 'react';
import { isToday, parseISO } from 'date-fns';
import type { Item } from '@/domain/types';
import { renderTitle } from '@/domain/markdown';
import { taskChoices } from '../domain/queue';
import { useT } from '@/hooks/useT';

/** A task's due time as the list shows it: `14:30` today, `Thu 10:00` later on. */
function timeLabel(item: Item, locale: string): string | null {
  const date = item.due?.date;
  if (!date?.includes('T')) return null;
  const at = parseISO(date);
  return new Intl.DateTimeFormat(locale, isToday(at) ? { hour: 'numeric', minute: '2-digit' } : { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(at);
}

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
  const { t, locale } = useT();
  const [active, setActive] = useState(0);
  // The list opens on focus, so a planned task is a click away before typing anything.
  const [open, setOpen] = useState(false);
  const matches = open && !selectedId ? taskChoices(items, value, new Date()) : [];
  return (
    <div className="fx-field">
      <input
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        onChange={(event) => { onChange(event.target.value); setActive(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && matches.length) {
            event.preventDefault();
            setOpen(false);
          } else if (event.key === 'ArrowDown' && matches.length) {
            event.preventDefault();
            setActive((index) => (index + 1) % matches.length);
          } else if (event.key === 'ArrowUp' && matches.length) {
            event.preventDefault();
            setActive((index) => (index - 1 + matches.length) % matches.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (matches[active]) { onSelect(matches[active]); setOpen(false); }
            else if (value.trim()) onCreate?.();
          }
        }}
      />
      {matches.length > 0 && (
        <ul className="fx-suggest" aria-label={t('focus.suggestions')}>
          {matches.map((item, index) => (
            <li key={item.id} className={index === active ? 'is-active' : ''}>
              {/* mousedown keeps the field focused, so the list is still there for the click */}
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(item); setOpen(false); }}>
                <span className="fx-suggest-title" dangerouslySetInnerHTML={{ __html: renderTitle(item.content) }} />
                {timeLabel(item, locale) && <span className="fx-suggest-time">{timeLabel(item, locale)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
