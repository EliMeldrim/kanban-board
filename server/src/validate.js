/**
 * Small validation helpers. Every helper appends human-readable messages to
 * an errors array; routes turn a non-empty array into a 400 response with the
 * consistent shape: { error: { message, details: [...] } }.
 */

export const LIMITS = {
  columnTitle: 100,
  cardTitle: 200,
  description: 5000,
  labelCount: 10,
  labelLength: 40,
};

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function checkTitle(errors, value, { field = 'title', max, required }) {
  if (value === undefined) {
    if (required) errors.push(`"${field}" is required.`);
    return;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`"${field}" must be a non-empty string.`);
  } else if (value.trim().length > max) {
    errors.push(`"${field}" must be at most ${max} characters.`);
  }
}

export function checkDescription(errors, value) {
  if (value === undefined) return;
  if (typeof value !== 'string') {
    errors.push('"description" must be a string.');
  } else if (value.length > LIMITS.description) {
    errors.push(`"description" must be at most ${LIMITS.description} characters.`);
  }
}

export function checkLabels(errors, value) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push('"labels" must be an array of strings.');
    return;
  }
  if (value.length > LIMITS.labelCount) {
    errors.push(`"labels" may contain at most ${LIMITS.labelCount} entries.`);
  }
  for (const label of value) {
    if (typeof label !== 'string' || label.trim().length === 0) {
      errors.push('Each label must be a non-empty string.');
      break;
    }
    if (label.length > LIMITS.labelLength) {
      errors.push(`Each label must be at most ${LIMITS.labelLength} characters.`);
      break;
    }
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function checkDueDate(errors, value) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    errors.push('"dueDate" must be null or a date string in YYYY-MM-DD format.');
    return;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    errors.push(`"dueDate" is not a valid calendar date: ${value}.`);
  }
}

/** Send a consistent 400 response. */
export function badRequest(res, message, details) {
  const error = { message };
  if (details && details.length > 0) error.details = details;
  return res.status(400).json({ error });
}

/** Send a consistent 404 response. */
export function notFound(res, message) {
  return res.status(404).json({ error: { message } });
}
