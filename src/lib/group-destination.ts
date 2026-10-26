// Only group destinations can be carried through authentication.
export function groupDestination(value: unknown): string {
  return typeof value === "string" && /^\/groups\/[A-Za-z0-9_-]+$/.test(value)
    ? value
    : "/feed";
}

export function destinationQuery(destination: string): string {
  return destination === "/feed"
    ? ""
    : `?next=${encodeURIComponent(destination)}`;
}
