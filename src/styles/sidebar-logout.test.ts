import { readFileSync } from "node:fs";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { expect, test } from "vitest";
import tailwindConfig from "../../tailwind.config";

test("logout content has equal vertical insets in light and dark mode", async () => {
  const source = readFileSync("src/styles/components.css", "utf8");
  const { css } = await postcss([tailwindcss(tailwindConfig)]).process(
    `@tailwind base;\n${source}`,
    { from: undefined },
  );
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const host = document.createElement("div");
  host.innerHTML = '<button class="sidebar-logout">Log out</button>';
  document.body.appendChild(host);

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
