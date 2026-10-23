/**
 * Event dates (drive day, campaign end) are calendar days, stored as midnight UTC.
 * The browser sends/receives them as "YYYY-MM-DD".
 */
export function toISODate(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function fromISODate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Today's calendar date on the server (local time), as "YYYY-MM-DD". */
export function todayISODate() {
  return new Date().toLocaleDateString('en-CA'); // en-CA formats as YYYY-MM-DD
}

export function daysFromToday(days: number) {
  const d = fromISODate(todayISODate());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
