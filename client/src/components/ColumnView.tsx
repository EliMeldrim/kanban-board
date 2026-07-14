import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { Column } from '../types';
import CardView from './CardView';

interface ColumnViewProps {
  column: Column;
  index: number;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
  onAddCard: (columnId: number, title: string) => void;
  onOpenCard: (cardId: number) => void;
}

export default function ColumnView({
  column,
  index,
  onRename,
  onDelete,
  onAddCard,
  onOpenCard,
}: ColumnViewProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [addingCard, setAddingCard] = useState(false);
  const [cardDraft, setCardDraft] = useState('');

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== column.title) onRename(column.id, trimmed);
    setEditingTitle(false);
  };

  const handleTitleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitTitle();
    if (e.key === 'Escape') {
      setTitleDraft(column.title);
      setEditingTitle(false);
    }
  };

  const submitCard = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = cardDraft.trim();
    if (trimmed) {
      onAddCard(column.id, trimmed);
      setCardDraft('');
    }
  };

  const handleDelete = () => {
    const n = column.cards.length;
    const ok =
      n === 0 ||
      window.confirm(
        `Delete "${column.title}" and its ${n} card${n === 1 ? '' : 's'}? This cannot be undone.`
      );
    if (ok) onDelete(column.id);
  };

  return (
    <Draggable draggableId={`column-${column.id}`} index={index}>
      {(provided, snapshot) => (
        <section
          className={`column${snapshot.isDragging ? ' is-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <header className="column-header" {...provided.dragHandleProps}>
            {editingTitle ? (
              <input
                className="column-title-input"
                value={titleDraft}
                autoFocus
                maxLength={100}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={handleTitleKey}
                aria-label="Column title"
              />
            ) : (
              <button
                className="column-title"
                title="Click to rename"
                onClick={() => {
                  setTitleDraft(column.title);
                  setEditingTitle(true);
                }}
              >
                {column.title}
              </button>
            )}
            <span className="column-count">{column.cards.length}</span>
            <button
              className="icon-btn"
              title="Delete column"
              aria-label={`Delete column ${column.title}`}
              onClick={handleDelete}
            >
              &times;
            </button>
          </header>

          <Droppable droppableId={`col-${column.id}`} type="CARD">
            {(dropProvided, dropSnapshot) => (
              <div
                className={`card-list${dropSnapshot.isDraggingOver ? ' is-over' : ''}`}
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
              >
                {column.cards.map((card, cardIndex) => (
                  <CardView
                    key={card.id}
                    card={card}
                    index={cardIndex}
                    onOpen={onOpenCard}
                  />
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          {addingCard ? (
            <form className="add-card-form" onSubmit={submitCard}>
              <textarea
                className="add-card-input"
                value={cardDraft}
                autoFocus
                rows={2}
                maxLength={200}
                placeholder="Card title…"
                onChange={(e) => setCardDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitCard(e);
                  }
                  if (e.key === 'Escape') {
                    setCardDraft('');
                    setAddingCard(false);
                  }
                }}
              />
              <div className="add-card-actions">
                <button type="submit" className="btn btn-primary">
                  Add card
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setCardDraft('');
                    setAddingCard(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button className="add-card-btn" onClick={() => setAddingCard(true)}>
              + Add card
            </button>
          )}
        </section>
      )}
    </Draggable>
  );
}
