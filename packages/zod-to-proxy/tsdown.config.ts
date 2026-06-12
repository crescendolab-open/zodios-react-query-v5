import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/zodios.ts"],
  dts: true,
  tsconfig: "tsconfig.lib.json",
  copy: [
    { from: "../../README.md", to: "README.md" },
    { from: "../../LICENSE", to: "LICENSE" },
  ],
});
