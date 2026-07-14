import { useEffect, useState } from 'react';
import type { Card, CardPatch } from '../types';
import LabelChip from './LabelChip';

interface CardModalProps {
  card: Card;
  onClose: () => void;
  onSave: (id: number, patch: CardPatch) => void;
  onDelete: (id: number) => void;
}

export default function CardModal({ card, onClose, onSave, onDelete }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [labelsText, setLabelsText] = useState(card.labels.join(', '));
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const parsedLabels = labelsText
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave(card.id, {
      title: trimmedTitle,
      description,
      labels: parsedLabels,
      dueDate: dueDate || null,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete card "${card.title}"? This cannot be undone.`)) {
      onDelete(card.id);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit card">
        <div className="modal-header">
          <h2>Edit card</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>

        <label className="field">
          <span className="field-label">Title</span>
          <input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field-label">Description</span>
          <textarea
            value={description}
            rows={5}
            maxLength={5000}
            placeholder="Add a more detailed description…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Labels (comma-separated)</span>
          <input
            value={labelsText}
            placeholder="frontend, bug, urgent"
            onChange={(e) => setLabelsText(e.target.value)}
          />
        </label>
        {parsedLabels.length > 0 && (
          <div className="card-labels modal-labels-preview">
            {parsedLabels.map((label) => (
              <LabelChip key={label} label={label} />
            ))}
          </div>
        )}

        <label className="field">
          <span className="field-label">Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete card
          </button>
          <div className="modal-actions-right">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!title.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
