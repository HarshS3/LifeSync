function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeToLocalStartOfDay(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKeyFromDate(date) {
  const d = normalizeToLocalStartOfDay(date);
  if (!d) return null;
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

module.exports = { dayKeyFromDate, normalizeToLocalStartOfDay };
