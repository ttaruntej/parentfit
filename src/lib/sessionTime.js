export function getSessionInstant(session) {
  if (!session) return null;
  const direct = toDate(session.performedAt) || toDate(session.performedAtTs);
  if (direct) return direct;

  if (session.date && session.timeOfDay) {
    return toDate(`${session.date}T${session.timeOfDay}:00+05:30`);
  }
  return toDate(session.date);
}

export function getSessionDateKey(session) {
  if (typeof session?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    return session.date;
  }
  const instant = getSessionInstant(session);
  if (!instant) return null;
  return `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`;
}

export function compareSessionsDesc(a, b) {
  return (getSessionInstant(b)?.getTime() || 0) - (getSessionInstant(a)?.getTime() || 0);
}

export function compareSessionsAsc(a, b) {
  return (getSessionInstant(a)?.getTime() || 0) - (getSessionInstant(b)?.getTime() || 0);
}

export function formatSessionDateTime(session, options = {}) {
  const instant = getSessionInstant(session);
  if (!instant) return 'No time';
  return instant.toLocaleString('en-IN', {
    weekday: options.weekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: session.timeZone || undefined,
  });
}

function toDate(value) {
  if (!value) return null;
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
