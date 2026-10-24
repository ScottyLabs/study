import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("unblock button styles", () => {
  test("uses red text without a border", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/styles/components.css"),
      "utf8",
    );

    const match = css.match(
      /\.unblock-text-button\s*\{([\s\S]*?)\}/,
    );

    expect(match).not.toBeNull();

    const styles = match?.[1] ?? "";
    const applyLine = styles.match(/@apply\s+([^;]+);/)?.[1] ?? "";
    const utilities = applyLine.trim().split(/\s+/);

    expect(utilities).toContain("text-lightSelected");
    expect(utilities).toContain("dark:text-darkSelected");

    expect(
      utilities.some(
        (utility) =>
          utility === "border" ||
          utility.startsWith("border-") ||
          utility.startsWith("dark:border"),
      ),
    ).toBe(false);
  });
});