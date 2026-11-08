import { vi } from "vitest";

type ChangeListener = (type: string, listener: () => void) => void;

export function mediaQueryList(media: string, matches: boolean) {
  return {
    matches,
    media,
    onchange: null,
    addEventListener: vi.fn<ChangeListener>(),
    removeEventListener: vi.fn<ChangeListener>(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => false,
  };
}
