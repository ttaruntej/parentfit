// Flatten workout sessions into a CSV (one row per set) for export to
// Excel / Google Sheets. Kept dependency-free on purpose.

const COLUMNS = [
  'Date', 'Time', 'Weekday', 'Type', 'Title',
  'Duration (min)', 'Intensity',
  'Exercise', 'Equipment', 'Set', 'Weight (kg)', 'Reps', 'Bodyweight',
  'Notes', 'Has Photo',
];

function escapeCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildSessionsCsv(sessions) {
  const rows = [COLUMNS.join(',')];

  for (const s of sessions) {
    const base = [
      s.date || '',
      s.timeOfDay || '',
      s.dayOfWeek || '',
      s.workoutType || '',
      s.title || '',
      s.durationMinutes ?? '',
      s.intensity || '',
    ];
    const tail = [s.notes || '', s.photoUrl ? 'Yes' : 'No'];
    const exercises = s.exercises || [];

    if (exercises.length === 0) {
      rows.push([...base, '', '', '', '', '', '', ...tail].map(escapeCell).join(','));
      continue;
    }

    for (const ex of exercises) {
      const sets = ex.sets && ex.sets.length ? ex.sets : [null];
      sets.forEach((set, i) => {
        rows.push([
          ...base,
          ex.name || '',
          ex.equipment || '',
          set ? i + 1 : '',
          set && !set.bodyweight && set.weight_kg != null ? set.weight_kg : '',
          set && set.reps != null ? set.reps : '',
          set && set.bodyweight ? 'Yes' : '',
          ...tail,
        ].map(escapeCell).join(','));
      });
    }
  }

  return rows.join('\r\n');
}

export function downloadCsv(filename, csv) {
  // Prepend a BOM so Excel reads UTF-8 (and emoji in titles) correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
