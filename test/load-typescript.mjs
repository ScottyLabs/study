import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);

// Run the actual TypeScript modules with stubbed external services, without a bundler.
export function typescriptLoader(overrides = {}, globals = {}) {
  const cache = new Map();
  function load(filename) {
    const absolute = resolve(root, filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const code = ts.transpileModule(readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const localRequire = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier.startsWith("~/"))
        return load(`src/${specifier.slice(2)}.ts`);
      if (specifier.startsWith("."))
        return load(resolve(dirname(absolute), `${specifier}.ts`));
      return require(specifier);
    };
    const execute = new Function(
      "require",
      "module",
      "exports",
      ...Object.keys(globals),
      code,
    );
    execute(localRequire, module, module.exports, ...Object.values(globals));
    return module.exports;
  }
  return load;
}
