import { useCallback, useEffect, useState } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import * as api from './api';
import type { Card, CardPatch, Column } from './types';
import Board from './components/Board';
import CardModal from './components/CardModal';

export default function App() {
  const [columns, setColumns] = useState<Column[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setColumns(await api.fetchBoard());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load the board.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /** Run an optimistic update; on API failure show a toast and re-sync from the server. */
  const withRollback = useCallback(
    async (action: () => Promise<unknown>, failureMessage: string) => {
      try {
        await action();
      } catch (err) {
        setToast(err instanceof Error ? `${failureMessage}: ${err.message}` : failureMessage);
        void refresh();
      }
    },
    [refresh]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId, type } = result;
      if (!destination || !columns) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      if (type === 'COLUMN') {
        const next = [...columns];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        setColumns(next.map((c, i) => ({ ...c, position: i })));
        void withRollback(
          () => api.reorderColumns(next.map((c) => c.id)),
          'Could not reorder columns'
        );
        return;
      }

      // Card move
      const cardId = Number(draggableId.replace('card-', ''));
      const fromColumnId = Number(source.droppableId.replace('col-', ''));
      const toColumnId = Number(destination.droppableId.replace('col-', ''));

      setColumns((prev) => {
        if (!prev) return prev;
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
        const fromCol = next.find((c) => c.id === fromColumnId);
        const toCol = next.find((c) => c.id === toColumnId);
        if (!fromCol || !toCol) return prev;
        const [moved] = fromCol.cards.splice(source.index, 1);
        toCol.cards.splice(destination.index, 0, { ...moved, columnId: toColumnId });
        fromCol.cards.forEach((card, i) => (card.position = i));
        toCol.cards.forEach((card, i) => (card.position = i));
        return next;
      });
      void withRollback(
        () => api.moveCard(cardId, toColumnId, destination.index),
        'Could not move card'
      );
    },
    [columns, withRollback]
  );

  const handleAddColumn = useCallback(
    (title: string) => {
      void withRollback(async () => {
        const created = await api.createColumn(title);
        setColumns((prev) => (prev ? [...prev, created] : prev));
      }, 'Could not add column');
    },
    [withRollback]
  );

  const handleRenameColumn = useCallback(
    (id: number, title: string) => {
      setColumns((prev) =>
        prev ? prev.map((c) => (c.id === id ? { ...c, title } : c)) : prev
      );
      void withRollback(() => api.renameColumn(id, title), 'Could not rename column');
    },
    [withRollback]
  );

  const handleDeleteColumn = useCallback(
    (id: number) => {
      setColumns((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
      void withRollback(() => api.deleteColumn(id), 'Could not delete column');
    },
    [withRollback]
  );

  const handleAddCard = useCallback(
    (columnId: number, title: string) => {
      void withRollback(async () => {
        const created = await api.createCard(columnId, title);
        setColumns((prev) =>
          prev
            ? prev.map((c) =>
                c.id === columnId ? { ...c, cards: [...c.cards, created] } : c
              )
            : prev
        );
      }, 'Could not add card');
    },
    [withRollback]
  );

  const handleUpdateCard = useCallback(
    (id: number, patch: CardPatch) => {
      void withRollback(async () => {
        const updated = await api.updateCard(id, patch);
        setColumns((prev) =>
          prev
            ? prev.map((c) => ({
                ...c,
                cards: c.cards.map((card) => (card.id === id ? updated : card)),
              }))
            : prev
        );
      }, 'Could not save card');
    },
    [withRollback]
  );

  const handleDeleteCard = useCallback(
    (id: number) => {
      setOpenCardId(null);
      setColumns((prev) =>
        prev
          ? prev.map((c) => ({ ...c, cards: c.cards.filter((card) => card.id !== id) }))
          : prev
      );
      void withRollback(() => api.deleteCard(id), 'Could not delete card');
    },
    [withRollback]
  );

  const openCard: Card | null =
    (openCardId !== null &&
      columns?.flatMap((c) => c.cards).find((card) => card.id === openCardId)) ||
    null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo" aria-hidden="true" />
          Kanban Board
        </h1>
        <span className="app-subtitle">React + Express + SQLite</span>
      </header>

      {loadError && (
        <div className="board-message">
          <p>{loadError}</p>
          <button className="btn" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {!loadError && columns === null && <div className="board-message">Loading board…</div>}

      {!loadError && columns !== null && (
        <Board
          columns={columns}
          onDragEnd={handleDragEnd}
          onAddColumn={handleAddColumn}
          onRenameColumn={handleRenameColumn}
          onDeleteColumn={handleDeleteColumn}
          onAddCard={handleAddCard}
          onOpenCard={setOpenCardId}
        />
      )}

      {openCard && (
        <CardModal
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onSave={handleUpdateCard}
          onDelete={handleDeleteCard}
        />
      )}

      {toast && (
        <div className="toast" role="alert">
          {toast}
        </div>
      )}
    </div>
  );
}
