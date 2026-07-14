import { Draggable } from '@hello-pangea/dnd';
import type { Card } from '../types';
import DueBadge from './DueBadge';
import LabelChip from './LabelChip';

interface CardViewProps {
  card: Card;
  index: number;
  onOpen: (cardId: number) => void;
}

export default function CardView({ card, index, onOpen }: CardViewProps) {
  return (
    <Draggable draggableId={`card-${card.id}`} index={index}>
      {(provided, snapshot) => (
        <article
          className={`card${snapshot.isDragging ? ' is-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(card.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpen(card.id);
          }}
          role="button"
          aria-label={`Open card: ${card.title}`}
        >
          {card.labels.length > 0 && (
            <div className="card-labels">
              {card.labels.map((label) => (
                <LabelChip key={label} label={label} />
              ))}
            </div>
          )}
          <p className="card-title">{card.title}</p>
          <div className="card-meta">
            {card.dueDate && <DueBadge dueDate={card.dueDate} />}
            {card.description && (
              <span className="card-has-description" title="Has description">
                &#9776;
              </span>
            )}
          </div>
        </article>
      )}
    </Draggable>
  );
}
