import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("api", { recursive: true });

const entries = ["send", "health", "index"];
for (const name of entries) {
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "esbuild",
      `src/entries/${name}.ts`,
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--legal-comments=none",
      `--outfile=api/${name}.js`,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
