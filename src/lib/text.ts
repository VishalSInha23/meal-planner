// Dashes become spaces, runs of spaces collapse, the ends are trimmed and the first letter is made uppercase.
export function normalizeName(value: string): string {
  const text = value.replace(/[-–—]/g, " ").replace(/ {2,}/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
