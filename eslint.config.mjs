import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Module boundaries (docs/modules.md): import a module only through its index.ts.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/internal/*", "@/modules/*/internal"],
              message: "Import modules through their public index.ts only (docs/modules.md).",
            },
          ],
        },
      ],
    },
  },
  {
    // Modules never depend on the app or UI layers.
    files: ["src/modules/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/app/*", "@/components/*"], message: "Modules must not import app/ or components/." },
            {
              group: ["@/modules/*/internal/*", "@/modules/*/schema"],
              message: "Import other modules through their public index.ts only.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not application source:
    ".claude/**",
    ".codex/**",
    "recon/**",
    "recon-v2/**",
    "docs/**",
    "drizzle/**",
    "data/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
