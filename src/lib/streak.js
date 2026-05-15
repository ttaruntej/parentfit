function formatDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentStreak(logs, today = new Date()) {
  if (!logs.length) return 0;

  const days = [
    ...new Set(logs.map((log) => (log.date ? formatDateKey(log.date) : null)).filter(Boolean)),
  ].sort().reverse();

  let streak = 0;
  const previous = new Date(today);
  previous.setHours(0, 0, 0, 0);

  for (const day of days) {
    const current = new Date(`${day}T00:00:00`);
    const diff = Math.round((previous.getTime() - current.getTime()) / 86400000);
    if (diff <= 1) {
      streak += 1;
      previous.setTime(current.getTime());
    } else {
      break;
    }
  }

  return streak;
}
