// Tablet-sized screens use the desktop layout in landscape and mobile in portrait.
export const DESKTOP_MIN_WIDTH = 1024;
const WIDE_DESKTOP_MIN_WIDTH = 1440;
export const DESKTOP_LAYOUT_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px) and (orientation: landscape), (min-width: ${WIDE_DESKTOP_MIN_WIDTH}px)`;
export const MOBILE_LAYOUT_QUERY = `(max-width: ${DESKTOP_MIN_WIDTH - 1}px), (max-width: ${WIDE_DESKTOP_MIN_WIDTH - 1}px) and (orientation: portrait)`;
