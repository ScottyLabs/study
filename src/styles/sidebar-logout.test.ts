import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { expect, test } from "vitest";

test("logout content has equal vertical insets in light and dark mode", async () => {
  // Optimize so Lightning CSS flattens nesting, which jsdom cannot parse
  const { css } = await postcss([tailwindcss({ optimize: { minify: false } })]).process(
    '@import "./globals.css";\n@import "./components.css";',
    { from: "src/styles/entry.css" },
  );
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  const host = document.createElement("div");
  host.innerHTML = '<button class="sidebar-logout">Log out</button>';
  document.body.append(host);

  try {
    for (const theme of ["light", "dark"]) {
      host.className = theme;
      const button = getComputedStyle(host.querySelector("button")!);
      expect(button.display, theme).toBe("flex");
      expect(button.alignItems, theme).toBe("center");
      expect(button.paddingTop, theme).toBe(button.paddingBottom);
      expect(button.borderTopWidth, theme).toBe(button.borderBottomWidth);
    }
  } finally {
    host.remove();
    style.remove();
  }
});
