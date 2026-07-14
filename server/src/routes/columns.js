import { Router } from 'express';
import db, {
  getColumn,
  serializeColumn,
  serializeCard,
} from '../db.js';
import {
  LIMITS,
  badRequest,
  notFound,
  checkTitle,
  isPlainObject,
  parseId,
} from '../validate.js';

const router = Router();

const allColumns = db.prepare('SELECT * FROM columns ORDER BY position');
const cardsByColumn = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position');
const maxPosition = db.prepare('SELECT COALESCE(MAX(position), -1) AS max FROM columns');
const insertColumn = db.prepare('INSERT INTO columns (title, position) VALUES (?, ?)');
const renameColumn = db.prepare('UPDATE columns SET title = ? WHERE id = ?');
const setColumnPosition = db.prepare('UPDATE columns SET position = ? WHERE id = ?');
const deleteColumn = db.prepare('DELETE FROM columns WHERE id = ?');

// GET /api/columns — all columns with their cards, in board order
router.get('/', (req, res) => {
  const columns = allColumns
    .all()
    .map((col) => serializeColumn(col, cardsByColumn.all(col.id).map(serializeCard)));
  res.json(columns);
});

// POST /api/columns — create a column at the end of the board
router.post('/', (req, res) => {
  if (!isPlainObject(req.body)) return badRequest(res, 'Request body must be a JSON object.');
  const errors = [];
  checkTitle(errors, req.body.title, { max: LIMITS.columnTitle, required: true });
  if (errors.length) return badRequest(res, 'Invalid column.', errors);

  const position = maxPosition.get().max + 1;
  const { lastInsertRowid } = insertColumn.run(req.body.title.trim(), position);
  res.status(201).json(serializeColumn(getColumn(lastInsertRowid), []));
});

// PUT /api/columns/reorder — persist a new left-to-right column order
// Body: { columnIds: number[] } — must be a permutation of all column ids.
router.put('/reorder', (req, res) => {
  if (!isPlainObject(req.body)) return badRequest(res, 'Request body must be a JSON object.');
  const { columnIds } = req.body;
  if (!Array.isArray(columnIds) || columnIds.some((id) => !Number.isInteger(id))) {
    return badRequest(res, 'Invalid reorder request.', [
      '"columnIds" must be an array of integer column ids.',
    ]);
  }

  const existing = allColumns.all().map((c) => c.id);
  const sameSet =
    existing.length === columnIds.length &&
    new Set(columnIds).size === columnIds.length &&
    existing.every((id) => columnIds.includes(id));
  if (!sameSet) {
    return badRequest(res, 'Invalid reorder request.', [
      `"columnIds" must contain every existing column id exactly once (expected ids: ${existing.join(', ')}).`,
    ]);
  }

  db.transaction(() => {
    columnIds.forEach((id, index) => setColumnPosition.run(index, id));
  })();

  const columns = allColumns
    .all()
    .map((col) => serializeColumn(col, cardsByColumn.all(col.id).map(serializeCard)));
  res.json(columns);
});

// PATCH /api/columns/:id — rename a column
router.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'Column id must be a positive integer.');
  if (!getColumn(id)) return notFound(res, `Column ${id} not found.`);
  if (!isPlainObject(req.body)) return badRequest(res, 'Request body must be a JSON object.');

  const errors = [];
  checkTitle(errors, req.body.title, { max: LIMITS.columnTitle, required: true });
  if (errors.length) return badRequest(res, 'Invalid column.', errors);

  renameColumn.run(req.body.title.trim(), id);
  res.json(serializeColumn(getColumn(id), cardsByColumn.all(id).map(serializeCard)));
});

// DELETE /api/columns/:id — delete a column and (via cascade) its cards
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'Column id must be a positive integer.');
  if (!getColumn(id)) return notFound(res, `Column ${id} not found.`);

  db.transaction(() => {
    deleteColumn.run(id);
    // Compact remaining column positions so they stay dense.
    allColumns.all().forEach((col, index) => setColumnPosition.run(index, col.id));
  })();

  res.status(204).end();
});

export default router;
