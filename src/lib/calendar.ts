export type BusyInterval = { start: string; end: string };

// Longest availability range a client may request, shared with the browser.
export const MAX_BUSY_RANGE_MS = 60 * 24 * 60 * 60_000;
