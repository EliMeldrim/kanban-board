import { useState } from 'react';
import type { FormEvent } from 'react';

interface AddColumnProps {
  onAdd: (title: string) => void;
}

export default function AddColumn({ onAdd }: AddColumnProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed) {
      onAdd(trimmed);
      setTitle('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button className="add-column-btn" onClick={() => setOpen(true)}>
        + Add column
      </button>
    );
  }

  return (
    <form className="add-column-form" onSubmit={submit}>
      <input
        className="add-column-input"
        value={title}
        autoFocus
        maxLength={100}
        placeholder="Column title…"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setTitle('');
            setOpen(false);
          }
        }}
      />
      <div className="add-card-actions">
        <button type="submit" className="btn btn-primary">
          Add column
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setTitle('');
            setOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
