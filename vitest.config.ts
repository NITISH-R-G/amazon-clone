import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Each test starts its own in-process Postgres (~3 s cold on a loaded machine; several files run in parallel).
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
