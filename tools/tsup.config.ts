import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/ai-sdk/index.ts"],
    outDir: "ai-sdk",
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
  },
]);
