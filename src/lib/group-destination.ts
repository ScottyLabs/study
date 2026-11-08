// Only group destinations can be carried through authentication.
export function groupDestination(value: unknown): string {
  return typeof value === "string" && /^\/groups\/[\w-]+$/u.test(value) ? value : "/feed";
}

export function destinationQuery(destination: string): string {
  return destination === "/feed" ? "" : `?next=${encodeURIComponent(destination)}`;
}
