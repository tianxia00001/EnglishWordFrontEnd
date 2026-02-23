const wordRegex = /[A-Za-z][A-Za-z'-]*/g;

export function tokenizeWords(text) {
  if (!text) return [];
  const matches = text.match(wordRegex);
  if (!matches) return [];
  return matches.map(item => ({
    id: `${item.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
    text: item,
    normalized: item.toLowerCase()
  }));
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '00:00';
  const total = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatRange(startSeconds, durationSeconds) {
  const start = Number(startSeconds) || 0;
  const duration = Number(durationSeconds) || 0;
  return `${formatDuration(start)} - ${formatDuration(start + duration)}`;
}