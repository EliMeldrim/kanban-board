export interface Card {
  id: number;
  columnId: number;
  title: string;
  description: string;
  labels: string[];
  dueDate: string | null; // YYYY-MM-DD
  position: number;
}

export interface Column {
  id: number;
  title: string;
  position: number;
  cards: Card[];
}

export interface CardPatch {
  title?: string;
  description?: string;
  labels?: string[];
  dueDate?: string | null;
}
