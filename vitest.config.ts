import { defineConfig } from "vitest/config";
import path from "node:path";

// Map the `@/*` import alias (from tsconfig.json) to the project root so tests
// import the same modules the app does. Tests are pure (no DB / network).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd()) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
