import express from 'express';
import { getBoard } from './db.js';
import columnsRouter from './routes/columns.js';
import cardsRouter from './routes/cards.js';

const app = express();
app.use(express.json());

// GET /api/health — liveness probe
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /api/board — the whole board: columns (in order) with their cards (in order)
app.get('/api/board', (req, res) => {
  res.json(getBoard());
});

app.use('/api/columns', columnsRouter);
app.use('/api/cards', cardsRouter);

// 404 for anything else — same JSON error shape as validation errors
app.use((req, res) => {
  res.status(404).json({ error: { message: `No route: ${req.method} ${req.path}` } });
});

// Error handler: malformed JSON bodies -> 400, everything else -> 500
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON.' } });
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error.' } });
});

export default app;
