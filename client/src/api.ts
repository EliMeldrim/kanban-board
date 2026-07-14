import type { Card, CardPatch, Column } from './types';

interface ApiErrorBody {
  error?: { message?: string; details?: string[] };
}

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body; fall through to generic message
    }
    throw new ApiError(
      body.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      body.error?.details
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function fetchBoard(): Promise<Column[]> {
  return request<Column[]>('/api/board');
}

export function createColumn(title: string): Promise<Column> {
  return request<Column>('/api/columns', jsonInit('POST', { title }));
}

export function renameColumn(id: number, title: string): Promise<Column> {
  return request<Column>(`/api/columns/${id}`, jsonInit('PATCH', { title }));
}

export function deleteColumn(id: number): Promise<void> {
  return request<void>(`/api/columns/${id}`, { method: 'DELETE' });
}

export function reorderColumns(columnIds: number[]): Promise<Column[]> {
  return request<Column[]>('/api/columns/reorder', jsonInit('PUT', { columnIds }));
}

export function createCard(columnId: number, title: string): Promise<Card> {
  return request<Card>('/api/cards', jsonInit('POST', { columnId, title }));
}

export function updateCard(id: number, patch: CardPatch): Promise<Card> {
  return request<Card>(`/api/cards/${id}`, jsonInit('PATCH', patch));
}

export function deleteCard(id: number): Promise<void> {
  return request<void>(`/api/cards/${id}`, { method: 'DELETE' });
}

export function moveCard(id: number, columnId: number, index: number): Promise<Card> {
  return request<Card>(`/api/cards/${id}/move`, jsonInit('POST', { columnId, index }));
}
