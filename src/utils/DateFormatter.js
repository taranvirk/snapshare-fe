export function getDate(date) {
  if (!date) return "Recently";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Recently";
  return value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function getRelativeDate(date) {
  if (!date) return "Just now";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Recently";
  const seconds = Math.round((value.getTime() - Date.now()) / 1000);
  const ranges = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let amount = seconds;
  for (const [range, unit] of ranges) {
    if (Math.abs(amount) < range) return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(amount), unit);
    amount /= range;
  }
  return getDate(date);
}
