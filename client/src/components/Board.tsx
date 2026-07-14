import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { Column } from '../types';
import ColumnView from './ColumnView';
import AddColumn from './AddColumn';

interface BoardProps {
  columns: Column[];
  onDragEnd: (result: DropResult) => void;
  onAddColumn: (title: string) => void;
  onRenameColumn: (id: number, title: string) => void;
  onDeleteColumn: (id: number) => void;
  onAddCard: (columnId: number, title: string) => void;
  onOpenCard: (cardId: number) => void;
}

export default function Board({
  columns,
  onDragEnd,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddCard,
  onOpenCard,
}: BoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(provided) => (
          <main className="board" ref={provided.innerRef} {...provided.droppableProps}>
            {columns.map((column, index) => (
              <ColumnView
                key={column.id}
                column={column}
                index={index}
                onRename={onRenameColumn}
                onDelete={onDeleteColumn}
                onAddCard={onAddCard}
                onOpenCard={onOpenCard}
              />
            ))}
            {provided.placeholder}
            <AddColumn onAdd={onAddColumn} />
          </main>
        )}
      </Droppable>
    </DragDropContext>
  );
}
