import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  unbundle: true,
  dts: true,
  tsconfig: "tsconfig.lib.json",
  sourcemap: true,
  copy: [
    { from: "../../README.md", to: "README.md" },
    { from: "../../LICENSE", to: "LICENSE" },
  ],
});
