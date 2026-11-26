import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/features/inventory/filters.ts",
        "src/features/inventory/slice.ts",
        "src/features/wizard/schema.ts",
        "src/features/wizard/draftSlice.ts",
        "src/features/wizard/storage.ts",
      ],
      reporter: ["text", "html"],
      thresholds: { lines: 81, statements: 81, functions: 81, branches: 81 },
    },
  },
});
