import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Each test starts its own in-process Postgres (~3 s cold on a loaded machine; several files run in parallel).
    // The demo-catalogue files also seed ~2,400 products and ~9,000 variants; cap parallel files so they do not starve each other.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    maxWorkers: 4,
  },
});
