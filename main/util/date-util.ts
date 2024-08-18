export function getDateString(date: Date = new Date(), separator = '-'): string {
  return `${date
    .getDate()
    .toString()
    .padStart(2, '0')}${separator}${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${separator}${date.getFullYear()}`;
}