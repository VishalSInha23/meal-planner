const TIME_OF_DAY = /^\d{2}:\d{2}$/;

// Slots by time of day, earliest first. A slot without a valid time yet goes last; ties keep their order.
export function sortedByTime<T>(items: T[], timeOf: (item: T) => string): T[] {
  const rank = (item: T) => (TIME_OF_DAY.test(timeOf(item)) ? timeOf(item) : "99:99");
  return items.toSorted((a, b) => rank(a).localeCompare(rank(b)));
}
