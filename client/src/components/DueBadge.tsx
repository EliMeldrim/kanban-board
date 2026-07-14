interface DueBadgeProps {
  dueDate: string; // YYYY-MM-DD
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function DueBadge({ dueDate }: DueBadgeProps) {
  const due = parseLocalDate(dueDate);
  const today = startOfToday();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round((due.getTime() - today.getTime()) / msPerDay);

  let tone: 'overdue' | 'soon' | 'normal' = 'normal';
  let text = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (daysLeft < 0) {
    tone = 'overdue';
    text = `Overdue · ${text}`;
  } else if (daysLeft === 0) {
    tone = 'soon';
    text = 'Due today';
  } else if (daysLeft <= 2) {
    tone = 'soon';
  }

  return (
    <span className={`due-badge due-${tone}`} title={`Due ${dueDate}`}>
      {text}
    </span>
  );
}
