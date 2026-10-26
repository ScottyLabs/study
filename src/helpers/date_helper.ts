type AppDate =
  | Date
  | {
      toDate: () => Date;
    };

const toDate = (date: AppDate) => (date instanceof Date ? date : date.toDate());

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatDateTime(
  timestamp: AppDate,
): [string | null, string | null] {
  if (!timestamp) {
    return [null, null];
  }
  const date = toDate(timestamp);
  const weekday = WEEKDAYS[date.getDay()];
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return [`${weekday} ${month}/${day}/${year}`, `${hours}:${minutes} ${ampm}`];
}
export function isInThePast(timestamp: AppDate) {
  const groupDate = toDate(timestamp);
  const now = new Date();
  return groupDate.getTime() < now.getTime();
}
