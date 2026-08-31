import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "prisma/**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 90000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
