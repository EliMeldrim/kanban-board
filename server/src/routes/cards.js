import { Router } from 'express';
import db, {
  getCard,
  getColumn,
  moveCard,
  compactColumn,
  serializeCard,
} from '../db.js';
import {
  LIMITS,
  badRequest,
  notFound,
  checkTitle,
  checkDescription,
  checkLabels,
  checkDueDate,
  isPlainObject,
  parseId,
} from '../validate.js';

const router = Router();

const maxPositionInColumn = db.prepare(
  'SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?'
);
const insertCard = db.prepare(
  'INSERT INTO cards (column_id, title, description, labels, due_date, position) VALUES (?, ?, ?, ?, ?, ?)'
);
const updateCard = db.prepare(
  'UPDATE cards SET title = ?, description = ?, labels = ?, due_date = ? WHERE id = ?'
);
const deleteCard = db.prepare('DELETE FROM cards WHERE id = ?');

function validateCardFields(body, { requireTitle }) {
  const errors = [];
  checkTitle(errors, body.title, { max: LIMITS.cardTitle, required: requireTitle });
  checkDescription(errors, body.description);
  checkLabels(errors, body.labels);
  checkDueDate(errors, body.dueDate);
  return errors;
}

// POST /api/cards — create a card at the end of a column
// Body: { columnId, title, description?, labels?, dueDate? }
router.post('/', (req, res) => {
  if (!isPlainObject(req.body)) return badRequest(res, 'Request body must be a JSON object.');

  const errors = validateCardFields(req.body, { requireTitle: true });
  const columnId = req.body.columnId;
  if (!Number.isInteger(columnId) || columnId <= 0) {
    errors.push('"columnId" is required and must be a positive integer.');
  } else if (!getColumn(columnId)) {
    errors.push(`Column ${columnId} does not exist.`);
  }
  if (errors.length) return badRequest(res, 'Invalid card.', errors);

  const position = maxPositionInColumn.get(columnId).max + 1;
  const { lastInsertRowid } = insertCard.run(
    columnId,
    req.body.title.trim(),
    req.body.description ?? '',
    JSON.stringify((req.body.labels ?? []).map((l) => l.trim())),
    req.body.dueDate ?? null,
    position
  );
  res.status(201).json(serializeCard(getCard(lastInsertRowid)));
});

// GET /api/cards/:id — fetch a single card
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'Card id must be a positive integer.');
  const card = getCard(id);
  if (!card) return notFound(res, `Card ${id} not found.`);
  res.json(serializeCard(card));
});

// PATCH /api/cards/:id — edit title/description/labels/dueDate
// (moving between columns is done via POST /api/cards/:id/move)
router.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'Card id must be a positive integer.');
  const card = getCard(id);
  if (!card) return notFound(res, `Card ${id} not found.`);
  if (!isPlainObject(req.body)) return badRequest(res, 'Request body must be a JSON object.');

  const allowed = ['title', 'description', 'labels', 'dueDate'];
  const unknown = Object.keys(req.body).filter((k) => !allowed.includes(k));
  const errors = validateCardFields(req.body, { requireTitle: false });
  if (unknown.length) {
    errors.push(
      `Unknown field(s): ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}. ` +
        'To move a card, use POST /api/cards/:id/move.'
    );
  }
  if (errors.length) return badRequest(res, 'Invalid card update.', errors);

  const next = {
    title: req.body.title !== undefined ? req.body.title.trim() : card.title,
    description: req.body.description !== undefined ? req.body.description : card.description,
    labels:
      req.body.labels !== undefined
        ? JSON.stringify(req.body.labels.map((l) => l.trim()))
        : card.labels,
    dueDate: req.body.dueDate !== undefined ? req.body.dueDate : card.due_date,
  };
  updateCard.run(next.title, next.description, next.labels, next.dueDate, id);
  res.json(serializeCard(getCard(id)));
});

// POST /api/cards/:id/move — move a card within/between columns
// Body: { columnId, index } — index is clamped to the target column length.
router.post('/:id/move', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'Card id must be a positive integer.');
  const card = getCard(id);
  if (!card) return notFound(res, `Card ${id} not found.`);
  if (!isPlainObject(req.body)) return badRequest(res, 'Request body must be a JSON object.');

  const errors = [];
  const { columnId, index } = req.body;
  if (!Number.isInteger(columnId) || columnId <= 0) {
    errors.push('"columnId" is required and must be a positive integer.');
  } else if (!getColumn(columnId)) {
    errors.push(`Column ${columnId} does not exist.`);
  }
  if (!Number.isInteger(index) || index < 0) {
    errors.push('"index" is required and must be a non-negative integer.');
  }
  if (errors.length) return badRequest(res, 'Invalid move request.', errors);

  const moved = moveCard(id, columnId, index);
  res.json(serializeCard(moved));
});

// DELETE /api/cards/:id — delete a card
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'Card id must be a positive integer.');
  const card = getCard(id);
  if (!card) return notFound(res, `Card ${id} not found.`);

  deleteCard.run(id);
  compactColumn(card.column_id);
  res.status(204).end();
});

export default router;
