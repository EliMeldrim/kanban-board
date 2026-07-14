import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'kanban.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS columns (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    title    TEXT    NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id   INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    labels      TEXT    NOT NULL DEFAULT '[]',
    due_date    TEXT,
    position    INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cards_column_position ON cards(column_id, position);
`);

/** Seed demo data on first run only. */
function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM columns').get().n;
  if (count > 0) return;

  const isoDaysFromNow = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const insertColumn = db.prepare('INSERT INTO columns (title, position) VALUES (?, ?)');
  const insertCard = db.prepare(
    'INSERT INTO cards (column_id, title, description, labels, due_date, position) VALUES (?, ?, ?, ?, ?, ?)'
  );

  db.transaction(() => {
    const todo = insertColumn.run('To Do', 0).lastInsertRowid;
    const doing = insertColumn.run('In Progress', 1).lastInsertRowid;
    const done = insertColumn.run('Done', 2).lastInsertRowid;

    insertCard.run(
      todo,
      'Design database schema',
      'Sketch out tables for columns, cards, and labels. Decide on position strategy for ordering.',
      JSON.stringify(['backend', 'design']),
      isoDaysFromNow(-2),
      0
    );
    insertCard.run(
      todo,
      'Write API documentation',
      'Document every REST endpoint with request/response examples.',
      JSON.stringify(['docs']),
      isoDaysFromNow(5),
      1
    );
    insertCard.run(
      todo,
      'Add keyboard shortcuts',
      'N for new card, arrow keys to navigate between cards.',
      JSON.stringify(['frontend', 'enhancement']),
      null,
      2
    );
    insertCard.run(
      doing,
      'Implement drag and drop',
      'Cards should move within and between columns; columns should be reorderable too.',
      JSON.stringify(['frontend']),
      isoDaysFromNow(1),
      0
    );
    insertCard.run(
      doing,
      'Set up CI pipeline',
      'Lint, type-check, and build on every push.',
      JSON.stringify(['devops']),
      isoDaysFromNow(3),
      1
    );
    insertCard.run(
      done,
      'Scaffold monorepo',
      'npm workspaces with /server and /client, concurrently for local dev.',
      JSON.stringify(['setup']),
      null,
      0
    );
    insertCard.run(
      done,
      'Pick the tech stack',
      'React 18 + Vite + TypeScript on the front, Express + better-sqlite3 on the back.',
      JSON.stringify(['design', 'decision']),
      isoDaysFromNow(-7),
      1
    );
  })();

  console.log('Seeded database with demo board.');
}

seedIfEmpty();

// ---------- Serialization ----------

export function serializeCard(row) {
  return {
    id: row.id,
    columnId: row.column_id,
    title: row.title,
    description: row.description,
    labels: JSON.parse(row.labels),
    dueDate: row.due_date,
    position: row.position,
  };
}

export function serializeColumn(row, cards = []) {
  return {
    id: row.id,
    title: row.title,
    position: row.position,
    cards,
  };
}

// ---------- Queries ----------

const stmts = {
  allColumns: db.prepare('SELECT * FROM columns ORDER BY position'),
  columnById: db.prepare('SELECT * FROM columns WHERE id = ?'),
  cardsByColumn: db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position'),
  cardById: db.prepare('SELECT * FROM cards WHERE id = ?'),
  cardIdsByColumn: db.prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position'),
  setCardSlot: db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?'),
};

export function getBoard() {
  return stmts.allColumns
    .all()
    .map((col) => serializeColumn(col, stmts.cardsByColumn.all(col.id).map(serializeCard)));
}

export function getColumn(id) {
  return stmts.columnById.get(id);
}

export function getCard(id) {
  return stmts.cardById.get(id);
}

/**
 * Move a card to a target column at a target index, rewriting positions of
 * every affected card so ordering stays dense (0..n-1). Runs in a transaction.
 */
export const moveCard = db.transaction((cardId, toColumnId, toIndex) => {
  const card = stmts.cardById.get(cardId);
  const sourceIds = stmts.cardIdsByColumn
    .all(card.column_id)
    .map((r) => r.id)
    .filter((id) => id !== cardId);

  const targetIds =
    toColumnId === card.column_id
      ? sourceIds
      : stmts.cardIdsByColumn.all(toColumnId).map((r) => r.id);

  const index = Math.max(0, Math.min(toIndex, targetIds.length));
  targetIds.splice(index, 0, cardId);

  if (toColumnId !== card.column_id) {
    sourceIds.forEach((id, i) => stmts.setCardSlot.run(card.column_id, i, id));
  }
  targetIds.forEach((id, i) => stmts.setCardSlot.run(toColumnId, i, id));

  return stmts.cardById.get(cardId);
});

/** Re-number card positions within a column so they are dense again. */
export const compactColumn = db.transaction((columnId) => {
  stmts.cardIdsByColumn.all(columnId).forEach((r, i) => {
    stmts.setCardSlot.run(columnId, i, r.id);
  });
});

export default db;
